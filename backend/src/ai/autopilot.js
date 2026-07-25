/**
 * PetPulse — Autopilot (Phase 2)
 *
 * Proactive, scheduled agent jobs. Runs from POST /api/ai/jobs/run (cron-guarded).
 *
 * Booking policy (per the product decision):
 *   - Default: PROPOSE + one-tap confirm (a notification the owner acts on).
 *   - users.autopilot_opt_in = true: FULL auto — book directly, then notify.
 *
 * Uses the shared pg pool (prod DB). Human-in-the-loop by default; nothing
 * irreversible happens without the owner unless they opted in.
 */

import { query } from '../config/db.js';

/** Insert an in-app notification (matches the existing notifications schema). */
async function notify(userId, { type = 'system', title, message, action_url = null }) {
  await query(
    `INSERT INTO notifications (user_id, type, title, message, action_url) VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, message, action_url]
  );
}

/** First approved vet (placeholder for nearest-vet selection). */
async function pickVet() {
  const { rows } = await query(
    `SELECT vp.user_id FROM vet_profiles vp WHERE vp.status = 'approved' ORDER BY vp.created_at ASC LIMIT 1`
  );
  return rows[0]?.user_id || null;
}

/** Try to book the first free hour (09:00–17:00) on a given date. Returns appt row or null. */
async function bookFirstFreeSlot(pet_id, vet_user_id, dateStr, reason) {
  for (let hour = 9; hour <= 17; hour++) {
    const slot = `${dateStr}T${String(hour).padStart(2, '0')}:00:00.000Z`;
    try {
      const { rows } = await query(
        `INSERT INTO appointments (pet_id, vet_user_id, appointment_time, reason, handled_by_ai)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (vet_user_id, appointment_time) DO NOTHING
         RETURNING id, appointment_time`,
        [pet_id, vet_user_id, slot, reason]
      );
      if (rows[0]) return rows[0];
    } catch (e) {
      if (e.code !== '23505') throw e; // ignore unique conflicts, keep trying
    }
  }
  return null;
}

/**
 * Vaccination job: for vaccinations due within `windowDays`, either auto-book
 * (opted-in owners) or propose a booking (default).
 */
export async function runVaccinationJob({ windowDays = 14 } = {}) {
  const cutoff = new Date(Date.now() + windowDays * 86400000).toISOString().slice(0, 10);
  const { rows: due } = await query(
    `SELECT v.id AS vacc_id, v.vaccine_name, v.due_at,
            p.id AS pet_id, p.name AS pet_name, p.owner_id,
            u.first_name, COALESCE(u.autopilot_opt_in, FALSE) AS opt_in
       FROM vaccinations v
       JOIN pets p  ON p.id = v.pet_id
       JOIN users u ON u.id = p.owner_id
      WHERE v.status = 'due' AND v.due_at <= $1::date
      ORDER BY v.due_at ASC
      LIMIT 200`,
    [cutoff]
  );

  const results = { considered: due.length, autoBooked: 0, proposed: 0, skipped: 0 };
  const vetId = await pickVet();

  for (const v of due) {
    const dueLabel = new Date(v.due_at).toLocaleDateString();
    if (v.opt_in && vetId) {
      // FULL auto: book on the due date (or tomorrow if the due date is past).
      const today = new Date().toISOString().slice(0, 10);
      const dateStr = v.due_at > today ? String(v.due_at).slice(0, 10) : new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const appt = await bookFirstFreeSlot(v.pet_id, vetId, dateStr, `${v.vaccine_name} vaccination (auto-booked by VetAI Autopilot)`);
      if (appt) {
        await query(`UPDATE vaccinations SET status = 'booked' WHERE id = $1`, [v.vacc_id]);
        await notify(v.owner_id, {
          type: 'autopilot',
          title: `💉 ${v.pet_name}'s ${v.vaccine_name} is booked`,
          message: `Autopilot booked ${v.pet_name}'s ${v.vaccine_name} vaccination for ${new Date(appt.appointment_time).toLocaleString()}. Tap to review or reschedule.`,
          action_url: '/profile?tab=appointments',
        });
        results.autoBooked++;
      } else {
        results.skipped++;
      }
    } else {
      // Default: propose + one-tap confirm.
      await query(`UPDATE vaccinations SET status = 'reminded' WHERE id = $1`, [v.vacc_id]);
      await notify(v.owner_id, {
        type: 'autopilot',
        title: `💉 ${v.pet_name}'s ${v.vaccine_name} is due (${dueLabel})`,
        message: `It's almost time for ${v.pet_name}'s ${v.vaccine_name} vaccination. Tap to book an appointment with a vet.`,
        action_url: '/explore?open_chat=true',
      });
      results.proposed++;
    }
  }
  return results;
}

/** Appointment reminder job: notify owners of appointments within `withinHours`. */
export async function runAppointmentReminderJob({ withinHours = 24 } = {}) {
  const until = new Date(Date.now() + withinHours * 3600000).toISOString();
  const { rows } = await query(
    `SELECT a.id, a.appointment_time, p.owner_id, p.name AS pet_name
       FROM appointments a
       JOIN pets p ON p.id = a.pet_id
      WHERE a.status IN ('pending','confirmed')
        AND a.reminder_sent_at IS NULL
        AND a.appointment_time > NOW()
        AND a.appointment_time <= $1::timestamptz
      LIMIT 500`,
    [until]
  );

  for (const a of rows) {
    await notify(a.owner_id, {
      type: 'reminder',
      title: `⏰ Upcoming appointment for ${a.pet_name}`,
      message: `Reminder: ${a.pet_name} has a vet appointment on ${new Date(a.appointment_time).toLocaleString()}.`,
      action_url: '/profile?tab=appointments',
    });
    await query(`UPDATE appointments SET reminder_sent_at = NOW() WHERE id = $1`, [a.id]);
  }
  return { reminded: rows.length };
}

/**
 * Mating alerts: when a pet is newly listed for mating, notify owners of
 * compatible pets (same species, opposite gender). Processes only listings
 * created within `newWithinDays` so a daily run alerts each once.
 */
export async function runMatingAlertJob({ newWithinDays = 1, dryRun = false } = {}) {
  const cutoff = new Date(Date.now() - newWithinDays * 86400000).toISOString();
  const { rows: fresh } = await query(
    `SELECT id, owner_id, name, species, gender FROM pets
      WHERE is_mating = TRUE AND created_at >= $1::timestamptz LIMIT 100`,
    [cutoff]
  );

  let alerts = 0;
  for (const np of fresh) {
    if (!np.gender || !np.species) continue;
    const opposite = np.gender.toLowerCase() === 'male' ? 'female' : 'male';
    const { rows: partners } = await query(
      `SELECT DISTINCT p.owner_id, p.name FROM pets p
        WHERE p.is_mating = TRUE AND p.species ILIKE $1 AND p.gender ILIKE $2 AND p.owner_id <> $3
        LIMIT 50`,
      [np.species, opposite, np.owner_id]
    );
    for (const partner of partners) {
      if (!dryRun) {
        await notify(partner.owner_id, {
          type: 'match',
          title: `💗 New mating match for ${partner.name}`,
          message: `A new ${np.species} (${np.name}) was just listed for mating and may be compatible with ${partner.name}. Tap to view.`,
          action_url: '/community#mating',
        });
      }
      alerts++;
    }
  }
  return { newListings: fresh.length, alerts };
}

/**
 * Lost & Found proximity auto-match: for open found reports, notify owners of
 * lost pets within `radiusKm` (Haversine). Geolocation-based; true image-vision
 * matching (CLIP/llava) is a future enhancement.
 */
export async function runLostFoundMatchJob({ radiusKm = 15, dryRun = false } = {}) {
  const { rows: reports } = await query(
    `SELECT id, latitude, longitude FROM found_reports
      WHERE status = 'open' AND COALESCE(autopilot_notified, FALSE) = FALSE
        AND latitude IS NOT NULL AND longitude IS NOT NULL
      LIMIT 100`
  );

  let alerts = 0;
  for (const fr of reports) {
    const { rows: near } = await query(
      `SELECT p.owner_id, p.name,
              (6371 * acos(LEAST(1, GREATEST(-1,
                 cos(radians($1)) * cos(radians(lp.latitude)) * cos(radians(lp.longitude) - radians($2))
                 + sin(radians($1)) * sin(radians(lp.latitude)))))) AS dist_km
         FROM lost_pets lp JOIN pets p ON p.id = lp.pet_id
        WHERE lp.status = 'lost' AND lp.latitude IS NOT NULL AND lp.longitude IS NOT NULL`,
      [fr.latitude, fr.longitude]
    );
    for (const m of near.filter(x => x.dist_km != null && x.dist_km <= radiusKm)) {
      if (!dryRun) {
        await notify(m.owner_id, {
          type: 'lost_found',
          title: `🔎 Possible sighting near ${m.name}`,
          message: `A found pet was reported about ${Number(m.dist_km).toFixed(1)} km from where ${m.name} went missing. Tap to check the Lost & Found board.`,
          action_url: '/community#lost-found',
        });
      }
      alerts++;
    }
    if (!dryRun) await query(`UPDATE found_reports SET autopilot_notified = TRUE WHERE id = $1`, [fr.id]);
  }
  return { reports: reports.length, alerts };
}

/** Run all autopilot jobs; returns a summary. */
export async function runAllJobs(opts = {}) {
  const vaccinations = await runVaccinationJob(opts);
  const reminders = await runAppointmentReminderJob(opts);
  const matingAlerts = await runMatingAlertJob(opts);
  const lostFound = await runLostFoundMatchJob(opts);
  return { ranAt: new Date().toISOString(), vaccinations, reminders, matingAlerts, lostFound };
}

export default { runAllJobs, runVaccinationJob, runAppointmentReminderJob, runMatingAlertJob, runLostFoundMatchJob };
