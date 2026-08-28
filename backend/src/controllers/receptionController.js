// ─────────────────────────────────────────────────────────────
// Clinic reception — the assistant-facing view of one vet's day.
//
// Scope comes from req.clinic.vetId (see middlewares/clinicScope.js), never
// from the request body or query, so an assistant cannot reach another
// clinic's diary by editing a parameter.
//
// What reception may see is deliberately narrower than what the vet sees.
// The appointment's `reason` — the owner's description of the problem — is
// clinical, and is NOT returned here. Reception gets who is coming, when,
// with which pet, and how to phone them. That is what a front desk needs to
// run a day, and nothing more.
// ─────────────────────────────────────────────────────────────
import { query } from '../config/db.js';

// Statuses a front desk is allowed to set. 'pending' is absent on purpose:
// reception can move an appointment forward or cancel it, but cannot quietly
// push a confirmed booking back into the unconfirmed pile.
const RECEPTION_STATUSES = ['confirmed', 'completed', 'cancelled'];

// Columns that are safe for a front desk. Note the absence of a.reason.
const RECEPTION_FIELDS = `
    a.id, a.appointment_time, a.status, a.created_at,
    p.name AS pet_name, p.species, p.breed AS pet_breed,
    o.id AS owner_id, o.first_name AS owner_first_name, o.last_name AS owner_last_name,
    o.phone AS owner_phone, o.profile_pic_url AS owner_avatar
`;

const writeAudit = async (req, action, details) => {
    try {
        await query(
            `INSERT INTO audit_logs (level, user_name, role, action, details)
             VALUES ($1, $2, $3, $4, $5)`,
            ['info', req.clinic.seatName, 'clinic_assistant', action, details]
        );
    } catch (e) {
        // An audit failure must never take the front desk down mid-shift.
        console.error('Audit write failed:', e.message);
    }
};

/**
 * GET /api/reception/summary
 * Counts for today, plus the next appointment still to come.
 */
export const getSummary = async (req, res) => {
    try {
        const { vetId } = req.clinic;

        const counts = await query(
            `SELECT
               COUNT(*)::int                                       AS total,
               COUNT(*) FILTER (WHERE a.status = 'pending')::int   AS pending,
               COUNT(*) FILTER (WHERE a.status = 'confirmed')::int AS confirmed,
               COUNT(*) FILTER (WHERE a.status = 'completed')::int AS completed,
               COUNT(*) FILTER (WHERE a.status = 'cancelled')::int AS cancelled
             FROM appointments a
             WHERE a.vet_user_id = $1
               AND a.appointment_time::date = CURRENT_DATE`,
            [vetId]
        );

        const next = await query(
            `SELECT ${RECEPTION_FIELDS}
             FROM appointments a
             JOIN pets p ON a.pet_id = p.id
             JOIN users o ON p.owner_id = o.id
             WHERE a.vet_user_id = $1
               AND a.appointment_time >= NOW()
               AND a.status IN ('pending', 'confirmed')
             ORDER BY a.appointment_time ASC
             LIMIT 1`,
            [vetId]
        );

        const vet = await query(
            `SELECT u.first_name, u.last_name, v.clinic_name
             FROM users u
             LEFT JOIN vet_profiles v ON v.user_id = u.id
             WHERE u.id = $1`,
            [vetId]
        );

        res.status(200).json({
            today: counts.rows[0],
            next: next.rows[0] || null,
            clinic: vet.rows[0] || null,
            seat: { name: req.clinic.seatName },
        });
    } catch (error) {
        console.error('Reception summary failed:', error.message);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

/**
 * GET /api/reception/appointments?date=YYYY-MM-DD
 * One day of the clinic's diary. Defaults to today.
 */
export const getDay = async (req, res) => {
    try {
        const { vetId } = req.clinic;
        const raw = typeof req.query.date === 'string' ? req.query.date.trim() : '';
        // Anything that is not an exact ISO date falls back to today rather
        // than reaching the query — the column is a timestamp, and a loose
        // string would either error or silently widen the range.
        const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(raw);

        const result = await query(
            `SELECT ${RECEPTION_FIELDS}
             FROM appointments a
             JOIN pets p ON a.pet_id = p.id
             JOIN users o ON p.owner_id = o.id
             WHERE a.vet_user_id = $1
               AND a.appointment_time::date = ${isIsoDate ? '$2::date' : 'CURRENT_DATE'}
             ORDER BY a.appointment_time ASC`,
            isIsoDate ? [vetId, raw] : [vetId]
        );

        res.status(200).json({
            date: isIsoDate ? raw : null,
            appointments: result.rows,
        });
    } catch (error) {
        console.error('Reception day fetch failed:', error.message);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

/**
 * PATCH /api/reception/appointments/:id/status
 * Confirm, complete or cancel — scoped to this clinic in the SQL itself.
 */
export const setStatus = async (req, res) => {
    try {
        const { vetId } = req.clinic;
        const { status } = req.body || {};

        if (!RECEPTION_STATUSES.includes(status)) {
            return res.status(400).json({
                error: `Status must be one of: ${RECEPTION_STATUSES.join(', ')}`,
            });
        }

        // The clinic check lives in the WHERE clause, so an appointment
        // belonging to another vet is never selected at all — it is not
        // fetched and then rejected.
        const result = await query(
            `UPDATE appointments
             SET status = $1
             WHERE id = $2 AND vet_user_id = $3
             RETURNING id, status, appointment_time`,
            [status, req.params.id, vetId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Appointment not found for this clinic.' });
        }

        await writeAudit(
            req,
            'Reception updated an appointment',
            `Appointment ${result.rows[0].id} set to ${status}.`
        );

        res.status(200).json({ appointment: result.rows[0] });
    } catch (error) {
        console.error('Reception status update failed:', error.message);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

/**
 * PUT /api/reception/appointments/:id/reschedule
 * Move an appointment, refusing a slot the clinic already has taken.
 */
export const reschedule = async (req, res) => {
    try {
        const { vetId } = req.clinic;
        const { appointment_time } = req.body || {};

        const when = new Date(appointment_time);
        if (!appointment_time || Number.isNaN(when.getTime())) {
            return res.status(400).json({ error: 'A valid appointment_time is required.' });
        }
        if (when.getTime() < Date.now()) {
            return res.status(400).json({ error: 'Appointments cannot be moved into the past.' });
        }

        // Double-booking is refused by the same rule the vet's own flow uses:
        // one live appointment per vet per moment.
        const clash = await query(
            `SELECT id FROM appointments
             WHERE vet_user_id = $1
               AND appointment_time = $2
               AND status IN ('pending', 'confirmed')
               AND id <> $3
             LIMIT 1`,
            [vetId, when.toISOString(), req.params.id]
        );

        if (clash.rowCount > 0) {
            return res.status(409).json({ error: 'That slot is already taken.' });
        }

        const result = await query(
            `UPDATE appointments
             SET appointment_time = $1
             WHERE id = $2 AND vet_user_id = $3 AND status IN ('pending', 'confirmed')
             RETURNING id, status, appointment_time`,
            [when.toISOString(), req.params.id, vetId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Appointment not found, or already closed.' });
        }

        await writeAudit(
            req,
            'Reception rescheduled an appointment',
            `Appointment ${result.rows[0].id} moved to ${when.toISOString()}.`
        );

        res.status(200).json({ appointment: result.rows[0] });
    } catch (error) {
        console.error('Reception reschedule failed:', error.message);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
