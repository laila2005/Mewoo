/**
 * PetPulse — AI Agent Tools (Vercel AI SDK + Zod)
 *
 * Tools are built PER REQUEST via buildTools(ctx) so the server owns identity.
 * `ctx.userId` comes from the verified JWT (or is set by createAccount during
 * guest onboarding) — it is NEVER taken from the model or request body. Every
 * write is authorized against ctx.userId inside the handler.
 *
 * Backed by the shared pg pool (config/db.js) — the same production database
 * the rest of the app uses. No Supabase JS client.
 */

import { tool } from 'ai';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { searchKnowledge } from './ragService.js';

/** Great-circle distance in km between two lat/lng points. */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format a vet's display name as "Dr. First Last" without doubling an existing "Dr." prefix. */
function vetName(first, last) {
  const full = `${first || ''} ${last || ''}`.replace(/\s+/g, ' ').trim();
  return /^dr\.?\s/i.test(full) ? full.replace(/^dr\.?\s*/i, 'Dr. ') : `Dr. ${full}`;
}

/**
 * Check whether a Cairo wall-clock instant falls within a vet's working days/hours.
 * @returns {null | {code, working_hours, available_days, day, time}} null = available.
 */
function checkVetAvailability(when, availableDays, workingHours) {
  // Day + HH:MM as seen in Africa/Cairo (the timezone bookings are stored in).
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(when);
  const day = parts.find(p => p.type === 'weekday')?.value || '';
  const hh = Number(parts.find(p => p.type === 'hour')?.value || '0') % 24;
  const mm = Number(parts.find(p => p.type === 'minute')?.value || '0');
  const minutes = hh * 60 + mm;
  const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  // available_days: null/empty ⇒ no day restriction (most seed vets).
  const days = Array.isArray(availableDays) ? availableDays.filter(Boolean) : null;
  if (days && days.length && !days.some(d => d.toLowerCase() === day.toLowerCase())) {
    return { code: 'closed_day', available_days: days, working_hours: workingHours || null, day, time: timeStr };
  }
  // working_hours: {start:"09:00", end:"18:00"}. Reject before start or at/after end.
  const wh = workingHours && workingHours.start && workingHours.end ? workingHours : null;
  if (wh) {
    const [sh, sm] = String(wh.start).split(':').map(Number);
    const [eh, em] = String(wh.end).split(':').map(Number);
    const startMin = sh * 60 + (sm || 0), endMin = eh * 60 + (em || 0);
    if (minutes < startMin || minutes >= endMin) {
      return { code: 'outside_hours', working_hours: wh, available_days: days, day, time: timeStr };
    }
  }
  return null;
}

/** Africa/Cairo UTC offset ("+02:00"/"+03:00") for a calendar date (DST-aware). */
function cairoOffsetForDate(cairoDate) {
  try {
    const probe = new Date(`${cairoDate}T12:00:00Z`);
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', timeZoneName: 'longOffset' }).formatToParts(probe);
    const tzn = parts.find(p => p.type === 'timeZoneName')?.value || '';
    const m = tzn.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    if (m) return `${m[1]}${m[2]}:${m[3] || '00'}`;
  } catch { /* fall through */ }
  return '+02:00';
}

/** Add n days to a YYYY-MM-DD string. */
function addDays(cairoDate, n) {
  const d = new Date(`${cairoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Today's date (YYYY-MM-DD) as seen in Africa/Cairo. */
function cairoToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/**
 * Open hourly slots for a vet on a Cairo date (YYYY-MM-DD): working-hours slots
 * minus already-booked times minus past times. Returns [{ time:"HH:MM", iso }].
 */
async function getVetOpenSlots(vetUserId, cairoDate) {
  const vetRes = await query(
    `SELECT vp.available_days, vp.working_hours
       FROM users u LEFT JOIN vet_profiles vp ON vp.user_id = u.id
      WHERE u.id = $1 AND u.role = 'vet'`,
    [vetUserId]
  );
  if (!vetRes.rows.length) return [];
  const { available_days, working_hours } = vetRes.rows[0];
  const wh = (working_hours && working_hours.start && working_hours.end) ? working_hours : { start: '09:00', end: '17:00' };
  const offset = cairoOffsetForDate(cairoDate);
  const dayName = new Date(`${cairoDate}T12:00:00${offset}`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Africa/Cairo' });
  const days = Array.isArray(available_days) ? available_days.filter(Boolean) : null;
  if (days && days.length && !days.some(d => d.toLowerCase() === dayName.toLowerCase())) return [];
  const startH = parseInt(String(wh.start).split(':')[0], 10) || 9;
  const endH = parseInt(String(wh.end).split(':')[0], 10) || 17;
  const booked = await query(
    `SELECT to_char(appointment_time AT TIME ZONE 'Africa/Cairo', 'HH24:MI') AS t
       FROM appointments
      WHERE vet_user_id = $1 AND (appointment_time AT TIME ZONE 'Africa/Cairo')::date = $2::date
        AND (status IS NULL OR status::text <> 'cancelled')`,
    [vetUserId, cairoDate]
  );
  const taken = new Set(booked.rows.map(r => r.t));
  const now = Date.now();
  const slots = [];
  for (let h = startH; h < endH; h++) {
    const hhmm = `${String(h).padStart(2, '0')}:00`;
    if (taken.has(hhmm)) continue;
    const iso = `${cairoDate}T${hhmm}:00${offset}`;
    if (new Date(iso).getTime() <= now) continue;
    slots.push({ time: hhmm, iso });
  }
  return slots;
}

/** Pull a short area/neighborhood token from a free-text address ("Road 9, Maadi, Cairo" → "Maadi"). */
function deriveArea(address) {
  if (!address || typeof address !== 'string') return null;
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  // Prefer the second-to-last token (usually the district), else the last.
  return parts.length >= 2 ? parts[parts.length - 2] : parts[parts.length - 1];
}

/**
 * Build the tool set bound to a per-request context.
 * @param {{ userId: string|null }} ctx - mutable; createAccount sets userId for guests
 */
export function buildTools(ctx = { userId: null }) {
  // ───────────────────────────────────────────────
  // Tool 1: createAccount  (guest onboarding only)
  // ───────────────────────────────────────────────
  const createAccount = tool({
    description:
      'Create a new pet-owner account in PetPulse. Use this when a guest wants to sign up ' +
      'or provides their name and email for the first time. Always call this FIRST if the ' +
      'user does not yet have an account. Only pet-owner accounts can be created here.',
    parameters: z.object({
      email: z.string().describe("The user's email address."),
      name: z.string().optional().describe("The user's full name (e.g. 'Laila Mohamed'). Use this or first_name."),
      first_name: z.string().optional().describe("The user's first name."),
      last_name: z.string().optional().describe("The user's last name."),
      phone: z.string().optional().describe('Phone number, if provided.'),
    }),
    execute: async ({ email, name, first_name, last_name, phone }) => {
      // Models often pass a single `name` — accept it and split into first/last.
      if (!first_name && name) {
        const parts = String(name).trim().split(/\s+/);
        first_name = parts[0];
        if (!last_name) last_name = parts.slice(1).join(' ');
      }
      if (!first_name) first_name = String(email || '').split('@')[0] || 'Friend';
      last_name = last_name || '';
      // If already authenticated, do not create another account.
      if (ctx.userId) {
        const { rows } = await query(
          'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
          [ctx.userId]
        );
        if (rows[0]) {
          return { success: true, message: 'You are already signed in.', user: rows[0], already_existed: true };
        }
      }

      // Existing account with this email?
      const existing = await query(
        'SELECT id, email, first_name, last_name, role FROM users WHERE email = $1',
        [email]
      );
      if (existing.rows[0]) {
        // Bind the session to this account so onboarding can continue, but do
        // NOT reveal a password for an account the caller may not own.
        ctx.userId = existing.rows[0].id;
        return {
          success: true,
          message: `An account already exists for ${email}. Please sign in to continue.`,
          user: existing.rows[0],
          already_existed: true,
        };
      }

      // Create a new OWNER account (role is fixed server-side — never model-chosen).
      const tempPassword = `Mewoo-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const password_hash = await bcrypt.hash(tempPassword, await bcrypt.genSalt(10));

      const { rows } = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, phone)
         VALUES ($1, $2, $3, $4, 'owner', $5)
         RETURNING id, email, first_name, last_name, role, phone, created_at`,
        [email, password_hash, first_name, last_name || '', phone || null]
      );

      // Server-owned identity: bind the session to the freshly created user.
      ctx.userId = rows[0].id;

      return {
        success: true,
        message: `Account created successfully for ${first_name}.`,
        user: rows[0],
        temporary_password: tempPassword,
        already_existed: false,
      };
    },
  });

  // ───────────────────────────────────────────────
  // Tool 2: registerPet  (owner_id is server-owned)
  // ───────────────────────────────────────────────
  const registerPet = tool({
    description:
      'Register a pet for the current user. A pet record is required before booking a vet ' +
      'appointment. The pet is always created for the signed-in user.',
    parameters: z.object({
      name: z.string().min(1).describe("The pet's name."),
      species: z.string().default('dog').describe('Species of the pet (e.g., "dog", "cat").'),
      breed: z.string().optional().describe('Breed of the pet, if known.'),
      age_years: z.number().int().min(0).max(100).optional().describe('Age of the pet in years.'),
    }),
    execute: async ({ name, species, breed, age_years }) => {
      if (!ctx.userId) {
        return { success: false, error: 'No account yet. Ask the user for their name and email, then call createAccount first.' };
      }

      // Reuse an existing pet with the same name for this owner.
      const existing = await query(
        'SELECT id, name, species, breed FROM pets WHERE owner_id = $1 AND name ILIKE $2 LIMIT 1',
        [ctx.userId, name]
      );
      if (existing.rows[0]) {
        return { success: true, message: `Pet "${name}" is already registered.`, pet: existing.rows[0], already_existed: true };
      }

      const { rows } = await query(
        `INSERT INTO pets (owner_id, name, species, breed, age_years)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, owner_id, name, species, breed, age_years, created_at`,
        [ctx.userId, name, species || 'dog', breed || null, age_years ?? null]
      );

      return { success: true, message: `Pet "${name}" registered successfully.`, pet: rows[0], already_existed: false };
    },
  });

  // ───────────────────────────────────────────────
  // Tool 3: findAvailableVets  (read-only, location-aware)
  // ───────────────────────────────────────────────
  const findAvailableVets = tool({
    description:
      'Look up approved veterinarians on PetPulse, ranked nearest-first to the user. ' +
      'Pass `location` (a neighborhood/city like "Maadi" or "Zamalek") to rank by proximity. ' +
      'Returns real approved vets with clinic, address/area, specialties and fee.',
    parameters: z.object({
      limit: z.number().int().min(1).max(20).default(5).describe('Maximum number of vets to return.'),
      location: z.string().optional().describe('Neighborhood/city to rank vets by proximity (e.g. "Maadi").'),
    }),
    execute: async ({ limit, location }) => {
      const lim = limit || 5;
      const { rows } = await query(
        `SELECT vp.user_id, vp.clinic_name, vp.address, vp.specialties, vp.is_emergency,
                vp.consultation_fee, vp.experience,
                u.first_name, u.last_name, u.latitude, u.longitude, u.neighborhood
           FROM vet_profiles vp
           JOIN users u ON u.id = vp.user_id
          WHERE vp.status = 'approved' AND vp.is_demo IS NOT TRUE`
      );

      let raw = rows;
      // Fallback: any user with the vet role, if no approved profiles exist.
      if (raw.length === 0) {
        const fb = await query(
          `SELECT id AS user_id, NULL AS clinic_name, NULL AS address, NULL AS specialties,
                  FALSE AS is_emergency, NULL AS consultation_fee, NULL AS experience,
                  first_name, last_name, latitude, longitude, neighborhood
             FROM users WHERE role = 'vet'`
        );
        raw = fb.rows;
      }

      // Owner's coordinates/area for proximity ranking (best-effort).
      let owner = { lat: null, lng: null, area: location || null };
      if (ctx.userId) {
        const me = await query('SELECT latitude, longitude, neighborhood FROM users WHERE id = $1', [ctx.userId]);
        if (me.rows[0]) {
          owner.lat = me.rows[0].latitude != null ? Number(me.rows[0].latitude) : null;
          owner.lng = me.rows[0].longitude != null ? Number(me.rows[0].longitude) : null;
          if (!owner.area) owner.area = me.rows[0].neighborhood || null;
        }
      }
      const loc = (owner.area || '').trim().toLowerCase();

      const scored = raw.map(v => {
        const place = `${v.address || ''} ${v.clinic_name || ''} ${v.neighborhood || ''}`.toLowerCase();
        const areaMatch = loc && place.includes(loc); // e.g. "maadi" ⊂ "road 9, maadi, cairo"
        let distance_km = null;
        if (owner.lat != null && owner.lng != null && v.latitude != null && v.longitude != null) {
          distance_km = haversineKm(owner.lat, owner.lng, Number(v.latitude), Number(v.longitude));
        }
        return { v, areaMatch, distance_km };
      });

      // Deterministic ranking: area text-match first, then nearest by distance,
      // then vets that have a clinic listed, then stable by name. (No random order.)
      scored.sort((a, b) => {
        if (a.areaMatch !== b.areaMatch) return a.areaMatch ? -1 : 1;
        const da = a.distance_km == null ? Infinity : a.distance_km;
        const db = b.distance_km == null ? Infinity : b.distance_km;
        if (da !== db) return da - db;
        const ca = a.v.clinic_name ? 0 : 1, cb = b.v.clinic_name ? 0 : 1;
        if (ca !== cb) return ca - cb;
        return `${a.v.first_name} ${a.v.last_name}`.localeCompare(`${b.v.first_name} ${b.v.last_name}`);
      });

      const vets = scored.slice(0, lim).map(({ v, distance_km }) => ({
        vet_user_id: v.user_id,
        clinic_name: v.clinic_name || null,
        address: v.address || null,
        area: v.neighborhood || deriveArea(v.address),
        distance_km: distance_km != null ? Math.round(distance_km * 10) / 10 : null,
        specialties: Array.isArray(v.specialties) ? v.specialties.filter(Boolean) : [],
        is_emergency: !!v.is_emergency,
        consultation_fee: v.consultation_fee != null ? Number(v.consultation_fee) : null,
        experience: v.experience != null ? Number(v.experience) : null,
        name: vetName(v.first_name, v.last_name),
      }));

      return { success: true, vets, count: vets.length, ranked_by: loc ? `near ${owner.area}` : 'availability' };
    },
  });

  // ───────────────────────────────────────────────
  // Tool 4: bookAppointment  (authz + role checks)
  // ───────────────────────────────────────────────
  const bookAppointment = tool({
    description:
      "Book a vet appointment for the current user's pet. Requires a pet_id (from registerPet) " +
      'and a vet_user_id (from findAvailableVets). The pet must belong to the signed-in user.',
    parameters: z.object({
      pet_id: z.string().uuid().describe('The UUID of the pet (from registerPet result).'),
      vet_user_id: z.string().uuid().describe('The UUID of the vet user (from findAvailableVets result).'),
      appointment_time: z.string().describe(
        'ISO 8601 datetime for the appointment (e.g., "2026-07-24T10:00:00Z"). Must be in the future.'
      ),
      reason: z.string().default('General check-up').describe('Reason for the appointment.'),
    }),
    execute: async ({ pet_id, vet_user_id, appointment_time, reason }) => {
      if (!ctx.userId) {
        return { success: false, error: 'You must have an account to book. Create one first.' };
      }

      // Validate time.
      const when = new Date(appointment_time);
      if (isNaN(when.getTime())) return { success: false, error: 'Invalid appointment time format.' };
      if (when.getTime() < Date.now()) return { success: false, error: 'Appointment time must be in the future.' };

      // Authz: the pet must belong to the current user (never trust model identity).
      const owns = await query('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [pet_id, ctx.userId]);
      if (owns.rows.length === 0) {
        return { success: false, error: 'That pet was not found under your account.' };
      }

      // Role check (+ pull availability): vet_user_id must actually be a veterinarian.
      const vet = await query(
        `SELECT u.first_name, u.last_name, vp.available_days, vp.working_hours
           FROM users u LEFT JOIN vet_profiles vp ON vp.user_id = u.id
          WHERE u.id = $1 AND u.role = 'vet'`,
        [vet_user_id]
      );
      if (vet.rows.length === 0) {
        return { success: false, error: 'The selected provider is not a veterinarian. Use findAvailableVets to pick one.' };
      }

      // Availability: reject slots outside the vet's working days/hours (Cairo time).
      const vrow = vet.rows[0];
      const unavailable = checkVetAvailability(when, vrow.available_days, vrow.working_hours);
      if (unavailable) {
        const name = vetName(vrow.first_name, vrow.last_name);
        const wh = unavailable.working_hours;
        const error = unavailable.code === 'closed_day'
          ? `${name} isn't available on ${unavailable.day}. Working days: ${unavailable.available_days.join(', ')}.`
          : `${name} works ${wh.start}–${wh.end}. Please pick a time within working hours.`;
        return { success: false, ...unavailable, vet_name: name, error };
      }

      try {
        const { rows } = await query(
          `INSERT INTO appointments (pet_id, vet_user_id, appointment_time, reason, handled_by_ai)
           VALUES ($1, $2, $3, $4, TRUE)
           RETURNING id, pet_id, vet_user_id, status, appointment_time, reason, created_at`,
          [pet_id, vet_user_id, appointment_time, reason || 'General check-up']
        );
        return {
          success: true,
          message: `Appointment booked for ${when.toLocaleString()}.`,
          appointment: rows[0],
        };
      } catch (err) {
        // Unique constraint on (vet_user_id, appointment_time) closes the double-book race.
        if (err.code === '23505' || (err.message && err.message.includes('unique_vet_appointment'))) {
          return { success: false, code: 'slot_taken', error: 'That vet already has an appointment at that time. Please choose another slot.' };
        }
        console.error('bookAppointment DB error:', err.message);
        return { success: false, error: 'Could not book the appointment right now.' };
      }
    },
  });

  // ───────────────────────────────────────────────
  // Tool 5: searchMedicalGuidelines  (RAG)
  // ───────────────────────────────────────────────
  const searchMedicalGuidelines = tool({
    description:
      'Search the PetPulse veterinary knowledge base for medical information — symptoms, ' +
      'diseases, nutrition, preventive care, etc. Use for ANY pet health question. Returns ' +
      'knowledge chunks with source citations.',
    parameters: z.object({
      query: z.string().min(1).describe('The health question or topic to search for.'),
    }),
    execute: async ({ query: q }) => {
      try {
        const results = await searchKnowledge(q, 5);
        if (!results || results.length === 0) {
          return { success: true, message: 'No relevant medical information found in the knowledge base.', chunks: [], count: 0 };
        }
        return {
          success: true,
          chunks: results.map(r => ({ content: r.content, source: r.source, relevance_score: r.similarity })),
          count: results.length,
          message: `Found ${results.length} relevant knowledge chunks.`,
        };
      } catch (err) {
        console.error('RAG search error:', err.message);
        return { success: false, error: 'Medical knowledge search is temporarily unavailable.', chunks: [] };
      }
    },
  });

  // ───────────────────────────────────────────────
  // Tool 6: findMatingPartners  (mating smart matching)
  // ───────────────────────────────────────────────
  const findMatingPartners = tool({
    description:
      "Find compatible mating partners for the user's pet — same species, opposite gender. " +
      "If species/gender are omitted, they are inferred from the user's pet. Returns candidate pets.",
    parameters: z.object({
      species: z.string().optional().describe('Species to match (e.g., "dog", "cat"). Inferred from the user\'s pet if omitted.'),
      gender: z.string().optional().describe("Desired partner gender (opposite of the user's pet). Inferred if omitted."),
      breed: z.string().optional().describe('Optional breed filter.'),
      location: z.string().optional().describe('Optional location/city filter.'),
    }),
    execute: async ({ species, gender, breed, location }) => {
      let sp = species || null;
      let gen = gender || null;

      // Infer from the user's first pet when not provided.
      if ((!sp || !gen) && ctx.userId) {
        const mine = await query('SELECT species, gender FROM pets WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1', [ctx.userId]);
        if (mine.rows[0]) {
          if (!sp) sp = mine.rows[0].species;
          if (!gen) gen = (mine.rows[0].gender || 'male').toLowerCase() === 'male' ? 'female' : 'male';
        }
      }

      const excludeOwner = ctx.userId || '00000000-0000-0000-0000-000000000000';
      const cols = `p.id, p.name, p.species, p.breed, p.age_years, p.gender, p.bio, p.location, p.avatar_url,
                    u.first_name AS owner_first_name, u.last_name AS owner_last_name`;

      const conds = ['p.is_mating = TRUE', 'p.owner_id <> $1'];
      const params = [excludeOwner];
      if (sp) { params.push(sp); conds.push(`p.species ILIKE $${params.length}`); }
      if (gen) { params.push(gen); conds.push(`p.gender ILIKE $${params.length}`); }
      if (breed) { params.push(`%${breed}%`); conds.push(`p.breed ILIKE $${params.length}`); }
      if (location) { params.push(`%${location}%`); conds.push(`p.location ILIKE $${params.length}`); }

      let { rows } = await query(
        `SELECT ${cols} FROM pets p JOIN users u ON u.id = p.owner_id WHERE ${conds.join(' AND ')} ORDER BY p.created_at DESC LIMIT 6`,
        params
      );
      if (rows.length === 0) {
        rows = (await query(
          `SELECT ${cols} FROM pets p JOIN users u ON u.id = p.owner_id
            WHERE p.is_mating = TRUE AND p.owner_id <> $1 ORDER BY p.created_at DESC LIMIT 3`,
          [excludeOwner]
        )).rows;
      }

      return {
        success: true,
        criteria: { species: sp, gender: gen },
        matches: rows.map(r => ({
          pet_id: r.id, name: r.name, species: r.species, breed: r.breed, age_years: r.age_years,
          gender: r.gender, bio: r.bio, location: r.location, avatar_url: r.avatar_url,
          owner_name: `${r.owner_first_name} ${r.owner_last_name}`,
        })),
        count: rows.length,
      };
    },
  });

  // ───────────────────────────────────────────────
  // Tool 7: findAdoptablePets
  // ───────────────────────────────────────────────
  const findAdoptablePets = tool({
    description: 'Find pets available for adoption. Optional species/breed/location filters.',
    parameters: z.object({
      species: z.string().optional(),
      breed: z.string().optional(),
      location: z.string().optional(),
    }),
    execute: async ({ species, breed, location }) => {
      const cols = `p.id, p.name, p.species, p.breed, p.age_years, p.gender, p.bio, p.location, p.avatar_url,
                    u.first_name AS owner_first_name, u.last_name AS owner_last_name`;
      const conds = ['p.is_adoptable = TRUE'];
      const params = [];
      if (species) { params.push(species); conds.push(`p.species ILIKE $${params.length}`); }
      if (breed) { params.push(`%${breed}%`); conds.push(`p.breed ILIKE $${params.length}`); }
      if (location) { params.push(`%${location}%`); conds.push(`p.location ILIKE $${params.length}`); }

      const { rows } = await query(
        `SELECT ${cols} FROM pets p JOIN users u ON u.id = p.owner_id WHERE ${conds.join(' AND ')} ORDER BY p.created_at DESC LIMIT 6`,
        params
      );
      return {
        success: true,
        pets: rows.map(r => ({
          pet_id: r.id, name: r.name, species: r.species, breed: r.breed, age_years: r.age_years,
          gender: r.gender, bio: r.bio, location: r.location, avatar_url: r.avatar_url,
          owner_name: `${r.owner_first_name} ${r.owner_last_name}`,
        })),
        count: rows.length,
      };
    },
  });

  // ───────────────────────────────────────────────
  // Tool 8: searchProviders  (vet/trainer by name/specialty)
  // ───────────────────────────────────────────────
  const searchProviders = tool({
    description:
      'Search for veterinarians or trainers by name and/or specialty. role defaults to "vet". ' +
      'Use this to find a specific provider by name (unlike findAvailableVets which just lists).',
    parameters: z.object({
      role: z.enum(['vet', 'trainer']).default('vet'),
      name: z.string().optional().describe('Full or partial provider name.'),
      specialty: z.string().optional().describe('Specialty filter (mainly for trainers).'),
    }),
    execute: async ({ role, name, specialty }) => {
      const r = role || 'vet';
      if (r === 'trainer') {
        const conds = ["tp.status = 'approved'"];
        const params = [];
        if (name) { params.push(`%${name}%`); conds.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length})`); }
        if (specialty) { params.push(specialty); conds.push(`$${params.length} = ANY(tp.specialties)`); }
        const { rows } = await query(
          `SELECT tp.user_id, tp.specialties, u.first_name, u.last_name
             FROM trainer_profiles tp JOIN users u ON u.id = tp.user_id
            WHERE ${conds.join(' AND ')} LIMIT 6`,
          params
        );
        return {
          success: true, role: 'trainer',
          providers: rows.map(v => ({ provider_id: v.user_id, name: `${v.first_name} ${v.last_name}`, specialties: v.specialties || [] })),
          count: rows.length,
        };
      }
      const conds = ["vp.status = 'approved'", 'vp.is_demo IS NOT TRUE'];
      const params = [];
      if (name) { params.push(`%${name}%`); conds.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length})`); }
      const { rows } = await query(
        `SELECT vp.user_id, vp.clinic_name, u.first_name, u.last_name
           FROM vet_profiles vp JOIN users u ON u.id = vp.user_id
          WHERE ${conds.join(' AND ')} LIMIT 6`,
        params
      );
      return {
        success: true, role: 'vet',
        providers: rows.map(v => ({ provider_id: v.user_id, vet_user_id: v.user_id, name: vetName(v.first_name, v.last_name), clinic_name: v.clinic_name || null })),
        count: rows.length,
      };
    },
  });

  // ───────────────────────────────────────────────
  // Tool 9: navigateTo  (structured navigation action)
  // ───────────────────────────────────────────────
  const navigateTo = tool({
    description:
      'Offer the user a button to navigate to a page in the app (e.g., "/explore", "/community", ' +
      '"/marketplace", "/adoption"). Use when an action is best completed on a specific page.',
    parameters: z.object({
      route: z.string().describe('App route starting with "/" (e.g., "/explore").'),
      label: z.string().default('Open').describe('Button label.'),
    }),
    execute: async ({ route, label }) => {
      if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//')) {
        return { success: false, error: 'Invalid route.' };
      }
      return { success: true, route, label: label || 'Open' };
    },
  });

  const suggestSlots = tool({
    description:
      "List a vet's OPEN appointment slots so you can offer the user concrete times. " +
      'Optionally for a specific Cairo date (YYYY-MM-DD); omit the date to auto-find the next open day.',
    parameters: z.object({
      vet_user_id: z.string().uuid().describe('The vet user UUID (from findAvailableVets).'),
      date: z.string().optional().describe('Optional Cairo date YYYY-MM-DD. Omit to find the next available day.'),
      // The booking flow uses this to build a tappable day+time picker. Slots are
      // already filtered for closed days, taken appointments and past times, so
      // anything returned here is genuinely bookable.
      days: z.number().int().min(1).max(14).optional()
        .describe('Return this many upcoming open DAYS (each with its slots) instead of just the first one.'),
    }),
    execute: async ({ vet_user_id, date, days }) => {
      const vetRes = await query(
        `SELECT u.first_name, u.last_name, vp.working_hours, vp.available_days
           FROM users u LEFT JOIN vet_profiles vp ON vp.user_id = u.id
          WHERE u.id = $1 AND u.role = 'vet'`,
        [vet_user_id]
      );
      if (!vetRes.rows.length) return { success: false, error: 'The selected provider is not a veterinarian.' };
      const row = vetRes.rows[0];
      const name = vetName(row.first_name, row.last_name);
      const working_hours = (row.working_hours && row.working_hours.start) ? row.working_hours : { start: '09:00', end: '17:00' };
      const available_days = Array.isArray(row.available_days) ? row.available_days.filter(Boolean) : null;

      // Multi-day mode — walk forward and collect every day that has openings.
      if (days) {
        const start = date || cairoToday();
        const out = [];
        for (let i = 0; i < 14 && out.length < days; i++) {
          const dd = addDays(start, i);
          const slots = await getVetOpenSlots(vet_user_id, dd);
          if (slots.length) out.push({ date: dd, slots });
        }
        return { success: true, vet_name: name, working_hours, available_days, days: out };
      }

      if (date) {
        const slots = await getVetOpenSlots(vet_user_id, date);
        return { success: true, vet_name: name, working_hours, available_days, date, slots };
      }
      const start = cairoToday();
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const slots = await getVetOpenSlots(vet_user_id, d);
        if (slots.length) return { success: true, vet_name: name, working_hours, available_days, date: d, slots };
      }
      return { success: true, vet_name: name, working_hours, available_days, date: null, slots: [] };
    },
  });

  return {
    createAccount,
    registerPet,
    findAvailableVets,
    bookAppointment,
    suggestSlots,
    searchMedicalGuidelines,
    findMatingPartners,
    findAdoptablePets,
    searchProviders,
    navigateTo,
  };
}

// Exported for reuse by the deterministic booking flow.
export { getVetOpenSlots };

// Default (unbound) tool set — kept for compatibility; prefer buildTools(ctx).
export const allTools = buildTools({ userId: null });

export default buildTools;
