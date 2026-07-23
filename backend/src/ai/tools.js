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
      email: z.string().email().describe("The user's email address."),
      first_name: z.string().min(1).describe("The user's first name."),
      last_name: z.string().default('').describe("The user's last name. Empty string if not provided."),
      phone: z.string().optional().describe('Phone number, if provided.'),
    }),
    execute: async ({ email, first_name, last_name, phone }) => {
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
  // Tool 3: findAvailableVets  (read-only)
  // ───────────────────────────────────────────────
  const findAvailableVets = tool({
    description:
      'Look up approved veterinarians on PetPulse. Call this before booking to obtain a ' +
      'vet_user_id. Returns approved vets with clinic info.',
    parameters: z.object({
      limit: z.number().int().min(1).max(20).default(5).describe('Maximum number of vets to return.'),
    }),
    execute: async ({ limit }) => {
      const lim = limit || 5;
      const { rows } = await query(
        `SELECT vp.user_id, vp.clinic_name, u.first_name, u.last_name
           FROM vet_profiles vp
           JOIN users u ON u.id = vp.user_id
          WHERE vp.status = 'approved'
          LIMIT $1`,
        [lim]
      );

      let vets = rows;
      // Fallback: any user with the vet role, if no approved profiles exist.
      if (vets.length === 0) {
        const fb = await query(
          `SELECT id AS user_id, NULL AS clinic_name, first_name, last_name
             FROM users WHERE role = 'vet' LIMIT $1`,
          [lim]
        );
        vets = fb.rows;
      }

      return {
        success: true,
        vets: vets.map(v => ({
          vet_user_id: v.user_id,
          clinic_name: v.clinic_name || null,
          name: `Dr. ${v.first_name} ${v.last_name}`,
        })),
        count: vets.length,
      };
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

      // Role check: vet_user_id must actually be a veterinarian.
      const vet = await query("SELECT id FROM users WHERE id = $1 AND role = 'vet'", [vet_user_id]);
      if (vet.rows.length === 0) {
        return { success: false, error: 'The selected provider is not a veterinarian. Use findAvailableVets to pick one.' };
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
          return { success: false, error: 'That vet already has an appointment at that time. Please choose another slot.' };
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
      const conds = ["vp.status = 'approved'"];
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
        providers: rows.map(v => ({ provider_id: v.user_id, vet_user_id: v.user_id, name: `Dr. ${v.first_name} ${v.last_name}`, clinic_name: v.clinic_name || null })),
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

  return {
    createAccount,
    registerPet,
    findAvailableVets,
    bookAppointment,
    searchMedicalGuidelines,
    findMatingPartners,
    findAdoptablePets,
    searchProviders,
    navigateTo,
  };
}

// Default (unbound) tool set — kept for compatibility; prefer buildTools(ctx).
export const allTools = buildTools({ userId: null });

export default buildTools;
