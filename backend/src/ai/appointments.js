/**
 * PetPluse — Deterministic appointment lookup and cancellation for VetAI.
 *
 * Cancelling is destructive and irreversible for the user's plans, so it is NOT
 * exposed as a model tool. The model can never decide to cancel: the flow lists
 * what the user actually has, the user taps a specific appointment, and only
 * then does anything change. Every query is scoped to the caller.
 */

import { query } from '../config/db.js';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** The token a Cancel chip sends back. Unambiguous, and easy to detect. */
export const CANCEL_TOKEN = 'cancel-appointment';

/** Extract an appointment id from a chip reply like "cancel-appointment <uuid>". */
export function parseCancelToken(message = '') {
  const m = String(message);
  if (!m.toLowerCase().includes(CANCEL_TOKEN)) return null;
  const id = m.match(UUID_RE);
  return id ? id[0] : null;
}

/**
 * The caller's upcoming appointments — as the PET OWNER or as the PROVIDER,
 * mirroring how getUserAppointments scopes things elsewhere.
 */
export async function listUpcomingAppointments(userId, { limit = 5 } = {}) {
  if (!userId) return [];
  const { rows } = await query(
    `SELECT a.id, a.appointment_time, a.status::text AS status, a.reason,
            p.name  AS pet_name,
            v.first_name AS vet_first_name, v.last_name AS vet_last_name,
            vp.clinic_name
       FROM appointments a
       JOIN pets  p  ON p.id = a.pet_id
       LEFT JOIN users v ON v.id = a.vet_user_id
       LEFT JOIN vet_profiles vp ON vp.user_id = a.vet_user_id
      WHERE (p.owner_id = $1 OR a.vet_user_id = $1)
        AND a.status::text IN ('pending', 'confirmed')
        AND a.appointment_time > NOW()
      ORDER BY a.appointment_time ASC
      LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

/**
 * Cancel one appointment, but only if it belongs to the caller.
 * @returns {{ok: boolean, code?: string, appointment?: object}}
 */
export async function cancelOwnAppointment(userId, appointmentId) {
  if (!userId || !appointmentId || !UUID_RE.test(appointmentId)) {
    return { ok: false, code: 'bad_request' };
  }
  // Ownership is part of the WHERE clause, so a stranger's id simply matches
  // nothing — there is no separate check to forget.
  const { rows } = await query(
    `UPDATE appointments a
        SET status = 'cancelled'::appointment_status
      FROM pets p
      WHERE a.pet_id = p.id
        AND a.id = $2
        AND (p.owner_id = $1 OR a.vet_user_id = $1)
        AND a.status::text IN ('pending', 'confirmed')
      RETURNING a.id, a.appointment_time, a.vet_user_id, a.pet_id, p.name AS pet_name`,
    [userId, appointmentId]
  );
  if (!rows[0]) return { ok: false, code: 'not_found_or_not_yours' };
  return { ok: true, appointment: rows[0] };
}

/** "Monday, 17 August at 14:00" in Cairo, in the user's language. */
export function describeAppointment(row, lang = 'en') {
  const when = new Date(row.appointment_time).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: 'Africa/Cairo',
  });
  const vet = [row.vet_first_name, row.vet_last_name].filter(Boolean).join(' ');
  return { when, vet: vet ? `Dr. ${vet}` : null, clinic: row.clinic_name || null, pet: row.pet_name || null };
}

export default { listUpcomingAppointments, cancelOwnAppointment, describeAppointment, parseCancelToken, CANCEL_TOKEN };
