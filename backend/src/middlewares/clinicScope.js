// ─────────────────────────────────────────────────────────────
// Clinic reception scope.
//
// A clinic assistant is a real login owned by a vet. Everything it may see
// belongs to that one vet, so the scope is resolved here — once, from the
// database — and every reception controller reads req.clinic.vetId rather
// than trusting anything the client sent.
//
// The database lookup is deliberate and not a performance oversight. Tokens
// live for seven days, so a seat disabled or deleted by its vet would
// otherwise keep working for the rest of that week: the login check alone
// cannot revoke a token already in someone's hands. Re-reading the row on
// each request makes "disable" mean disabled immediately.
// ─────────────────────────────────────────────────────────────
import { query } from '../config/db.js';

export const requireClinicAssistant = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'clinic_assistant') {
            return res.status(403).json({ error: 'Forbidden: clinic assistants only' });
        }

        const result = await query(
            `SELECT id, manager_vet_id, assistant_disabled, first_name, last_name
             FROM users
             WHERE id = $1 AND role = 'clinic_assistant'`,
            [req.user.id]
        );

        const seat = result.rows[0];

        // Deleted seat: the token is valid but the account behind it is gone.
        if (!seat) {
            return res.status(403).json({ error: 'This assistant account no longer exists.' });
        }

        if (seat.assistant_disabled) {
            return res.status(403).json({
                error: 'This assistant account has been disabled by your clinic. Please contact your veterinarian.',
            });
        }

        // A seat with no manager cannot be scoped to anything, so it gets
        // nothing rather than falling back to something broader.
        if (!seat.manager_vet_id) {
            return res.status(403).json({ error: 'This assistant account is not linked to a clinic.' });
        }

        req.clinic = { vetId: seat.manager_vet_id, seatId: seat.id, seatName: `${seat.first_name} ${seat.last_name}` };
        next();
    } catch (error) {
        console.error('Clinic scope check failed:', error.message);
        return res.status(500).json({ error: 'Something went wrong.' });
    }
};

export default requireClinicAssistant;
