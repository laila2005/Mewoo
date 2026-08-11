import { query } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendNotificationEmail } from '../services/emailService.js';
import { isFeatureEnabled } from '../config/featureFlags.js';
import { buildIcs, calendarLinksHtml, verifyCalendarToken } from '../services/calendarLinks.js';

const VETS_COMING_SOON = 'Vet booking is coming soon — we are onboarding verified veterinarians. Thanks for your patience!';

/** Email a vet that they have a new booking (so they're notified when offline). */
export const emailVetOnBooking = async (vet_user_id, { appointment_time, reason, pet_id }) => {
    try {
        const vetInfo = await query('SELECT email, first_name FROM users WHERE id = $1', [vet_user_id]);
        if (!vetInfo.rows[0]?.email) return;
        let petName = 'a pet', species = 'pet';
        if (pet_id) {
            const p = await query('SELECT name, species FROM pets WHERE id = $1', [pet_id]);
            if (p.rows[0]) { petName = p.rows[0].name || petName; species = p.rows[0].species || species; }
        }
        const whenStr = new Date(appointment_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' });
        await sendNotificationEmail(vetInfo.rows[0].email, {
            subject: 'New booking on PetPulse',
            heading: 'You have a new appointment request',
            message: `${petName} (${species}) is booked for <strong>${whenStr}</strong>.<br/>Reason: ${reason || 'General check-up'}.<br/><br/>Open PetPulse to review, reschedule or cancel it.`,
            ctaLabel: 'Review Appointment',
            ctaLink: '/pro-dashboard',
        });
    } catch (err) {
        console.error('Vet booking email failed (non-fatal):', err.message);
    }
};

/**
 * PUT /api/bookings/appointments/:id/status
 *
 * The provider confirms / completes / cancels an appointment from the Work
 * Tracker. This endpoint did not exist: the dashboard called it, got a 404,
 * swallowed the error, and had already flipped the row to "confirmed" locally
 * with a success toast — so the status reverted to PENDING on the next load and
 * the owner never heard anything.
 *
 * Authorization is by ownership of the appointment, not by role alone: a vet may
 * only act on appointments booked WITH THEM.
 */
const ALLOWED_STATUS = ['pending', 'confirmed', 'completed', 'cancelled'];

export const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const status = String(req.body?.status || '').toLowerCase();

        if (!ALLOWED_STATUS.includes(status)) {
            return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUS.join(', ')}` });
        }

        // Load the appointment plus the people involved, in one round trip.
        const { rows } = await query(
            `SELECT a.id, a.status, a.appointment_time, a.reason, a.vet_user_id,
                    p.name  AS pet_name, p.species AS pet_species, p.owner_id,
                    o.email AS owner_email, o.first_name AS owner_first_name,
                    v.first_name AS vet_first_name, v.last_name AS vet_last_name,
                    vp.clinic_name
               FROM appointments a
               LEFT JOIN pets  p ON p.id = a.pet_id
               LEFT JOIN users o ON o.id = p.owner_id
               LEFT JOIN users v ON v.id = a.vet_user_id
               LEFT JOIN vet_profiles vp ON vp.user_id = a.vet_user_id
              WHERE a.id = $1`,
            [id]
        );
        const apt = rows[0];
        if (!apt) return res.status(404).json({ error: 'Appointment not found.' });

        const isProvider = apt.vet_user_id === req.user.id;
        const isAdmin = req.user.role === 'admin';
        // The owner may only cancel their own booking, never confirm it.
        const isOwnerCancelling = apt.owner_id === req.user.id && status === 'cancelled';
        if (!isProvider && !isAdmin && !isOwnerCancelling) {
            return res.status(403).json({ error: 'You are not allowed to change this appointment.' });
        }

        if (apt.status === status) {
            return res.status(200).json({ message: 'No change.', appointment: apt });
        }

        const upd = await query(
            `UPDATE appointments SET status = $1::appointment_status WHERE id = $2
             RETURNING id, status, appointment_time, reason, pet_id, vet_user_id`,
            [status, id]
        );

        // Tell the OWNER what happened. Non-fatal: a mail failure must not roll
        // back a status the provider has already set.
        if (apt.owner_email && (status === 'confirmed' || status === 'cancelled' || status === 'completed')) {
            const whenStr = new Date(apt.appointment_time).toLocaleString('en-US', {
                dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Cairo',
            });
            const vetName = [apt.vet_first_name, apt.vet_last_name].filter(Boolean).join(' ') || 'your veterinarian';
            const pet = apt.pet_name || 'your pet';
            const copy = {
                confirmed: {
                    subject: `Appointment confirmed — ${whenStr}`,
                    heading: 'Your appointment is confirmed',
                    message: `Good news${apt.owner_first_name ? ', ' + apt.owner_first_name : ''} — Dr. ${vetName} has confirmed your appointment for <strong>${pet}</strong>.<br/><br/><strong>When:</strong> ${whenStr}<br/><strong>Reason:</strong> ${apt.reason || 'General check-up'}<br/><br/>Please arrive a few minutes early.<br/><br/>` +
                        calendarLinksHtml({
                            id: apt.id,
                            appointment_time: apt.appointment_time,
                            petName: apt.pet_name,
                            vetName: vetName ? `Dr. ${vetName}` : null,
                            clinicName: apt.clinic_name,
                            reason: apt.reason,
                        }),
                },
                cancelled: {
                    subject: `Appointment cancelled — ${whenStr}`,
                    heading: 'Your appointment was cancelled',
                    message: `Your appointment for <strong>${pet}</strong> on ${whenStr} has been cancelled. You can book another time whenever suits you.`,
                },
                completed: {
                    subject: `Visit complete — ${pet}`,
                    heading: 'Thanks for visiting',
                    message: `${pet}'s appointment on ${whenStr} is marked complete. We hope the visit went well.`,
                },
            }[status];

            sendNotificationEmail(apt.owner_email, {
                ...copy,
                ctaLabel: 'View Appointment',
                ctaLink: '/profile?tab=appointments',
            }).catch((err) => console.error('Appointment status email failed (non-fatal):', err.message));
        }

        return res.status(200).json({ message: `Appointment ${status}.`, appointment: upd.rows[0] });
    } catch (error) {
        console.error('Error updating appointment status:', error);
        return res.status(500).json({ error: 'Failed to update the appointment.' });
    }
};

/**
 * GET /api/bookings/appointments/:id/calendar.ics
 *
 * Serves the appointment as an iCalendar file. iOS, Android, Outlook and Apple
 * Mail all open this natively, which is the "add to my phone's calendar" case.
 * Scoped to the people on the appointment — a calendar file leaks who is seeing
 * which vet and when.
 */
export const getAppointmentIcs = async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT a.id, a.appointment_time, a.reason, a.status::text AS status,
                    p.name AS pet_name, p.owner_id, a.vet_user_id,
                    v.first_name AS vet_first_name, v.last_name AS vet_last_name,
                    vp.clinic_name
               FROM appointments a
               JOIN pets p ON p.id = a.pet_id
               LEFT JOIN users v ON v.id = a.vet_user_id
               LEFT JOIN vet_profiles vp ON vp.user_id = a.vet_user_id
              WHERE a.id = $1`,
            [req.params.id]
        );
        const apt = rows[0];
        if (!apt) return res.status(404).json({ error: 'Appointment not found.' });

        // Either a valid signed token (the email link) or one of the people on
        // the appointment (the in-app button, which does send a session).
        const tokenOk = verifyCalendarToken(apt.id, req.query.t);
        const isParticipant = req.user
            && (apt.owner_id === req.user.id || apt.vet_user_id === req.user.id || req.user.role === 'admin');
        if (!tokenOk && !isParticipant) {
            return res.status(403).json({ error: 'Not your appointment.' });
        }

        const vetName = [apt.vet_first_name, apt.vet_last_name].filter(Boolean).join(' ');
        const ics = buildIcs({
            id: apt.id,
            appointment_time: apt.appointment_time,
            petName: apt.pet_name,
            vetName: vetName ? `Dr. ${vetName}` : null,
            clinicName: apt.clinic_name,
            reason: apt.reason,
        });

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="petpulse-appointment.ics"`);
        return res.status(200).send(ics);
    } catch (error) {
        console.error('Error building appointment .ics:', error);
        return res.status(500).json({ error: 'Could not build the calendar file.' });
    }
};

// Create a new vet appointment
export const createAppointment = async (req, res) => {
    try {
        if (!(await isFeatureEnabled('vets'))) {
            return res.status(403).json({ error: VETS_COMING_SOON, feature: 'vets' });
        }
        // The user ID comes from the authenticated token
        const user_id = req.user.id;
        const { vet_user_id, appointment_time, reason, pet_id } = req.body;

        if (!vet_user_id || !appointment_time || !reason) {
            return res.status(400).json({ error: 'Missing required fields: vet_user_id, appointment_time, reason' });
        }

        const newTime = new Date(appointment_time);
        if (isNaN(newTime.getTime()) || newTime <= new Date()) {
            return res.status(400).json({ error: 'Appointment time must be a valid future date.' });
        }

        // If pet_id is not provided, find the user's first pet
        let final_pet_id = pet_id;
        if (!final_pet_id) {
            const petResult = await query('SELECT id FROM pets WHERE owner_id = $1 LIMIT 1', [user_id]);
            if (petResult.rows.length > 0) {
                final_pet_id = petResult.rows[0].id;
            } else {
                return res.status(400).json({ 
                    error: 'You must add a pet to your profile before booking an appointment.',
                    code: 'NO_PET'
                });
            }
        }

        const insertQuery = `
            INSERT INTO appointments (pet_id, vet_user_id, appointment_time, reason)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const result = await query(insertQuery, [final_pet_id, vet_user_id, appointment_time, reason]);

        // Notify the Vet (in-app + email so they're reached when offline)
        await query(
            "INSERT INTO notifications (user_id, title, message, type, action_url) VALUES ($1, $2, $3, 'system', '/pro-dashboard')",
            [vet_user_id, 'New Appointment Request', `A new appointment has been requested for ${new Date(appointment_time).toLocaleString()}.`]
        );
        emailVetOnBooking(vet_user_id, { appointment_time, reason, pet_id: final_pet_id });

        // Notify the Client
        await query(
            "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'system')",
            [user_id, 'Appointment Confirmed', `Your appointment request for ${new Date(appointment_time).toLocaleString()} has been received.`]
        );

        // Write dynamic audit log
        try {
            const vetCheck = await query('SELECT first_name, last_name FROM users WHERE id = $1', [vet_user_id]);
            const vetName = vetCheck.rows.length > 0 ? `${vetCheck.rows[0].first_name} ${vetCheck.rows[0].last_name}` : 'Veterinarian';
            const clientName = `${req.user.first_name} ${req.user.last_name}`;
            const clientRole = req.user.role || 'owner';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', clientName, clientRole, 'Booked veterinary appointment', `Scheduled annual vaccination booster slot with ${vetName}.`]
            );
        } catch (logErr) {
            console.error('Failed to write appointment audit log:', logErr);
        }

        res.status(201).json({ appointment: result.rows[0] });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// Get user's appointments
export const getUserAppointments = async (req, res) => {
    try {
        const user_id = req.user.id;
        
        // Fetch appointments where the user is either the pet owner or the vet
        const getQuery = `
            SELECT a.*, p.name as pet_name, p.species, p.breed as pet_breed, v.clinic_name,
                   -- owner_id is needed so the provider can open a chat with the
                   -- client from the Work Tracker; without it the button could
                   -- only navigate to an empty inbox.
                   o.id as owner_id,
                   o.first_name as owner_first_name, o.last_name as owner_last_name, o.profile_pic_url as owner_avatar
            FROM appointments a
            JOIN pets p ON a.pet_id = p.id
            JOIN users o ON p.owner_id = o.id
            LEFT JOIN vet_profiles v ON a.vet_user_id = v.user_id
            WHERE p.owner_id = $1 OR a.vet_user_id = $1
            ORDER BY a.appointment_time DESC;
        `;
        
        const result = await query(getQuery, [user_id]);
        
        res.status(200).json({ appointments: result.rows });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};


// Cancel an appointment
export const cancelAppointment = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { id } = req.params;

        // Verify ownership — only pet owner or vet can cancel
        // Pull the people and the pet too — the notification should say WHO moved
        // WHICH pet's appointment, not just quote a bare timestamp.
        const checkQuery = `
            SELECT a.*, p.name AS pet_name, p.owner_id,
                   o.email AS owner_email, o.first_name AS owner_first_name,
                   v.first_name AS vet_first_name, v.last_name AS vet_last_name
              FROM appointments a
              JOIN pets p ON a.pet_id = p.id
              LEFT JOIN users o ON o.id = p.owner_id
              LEFT JOIN users v ON v.id = a.vet_user_id
             WHERE a.id = $1 AND (p.owner_id = $2 OR a.vet_user_id = $2)
        `;
        const check = await query(checkQuery, [id, user_id]);
        if (check.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized to cancel this appointment.' });
        }

        const apt = check.rows[0];
        if (apt.status === 'cancelled' || apt.status === 'completed') {
            return res.status(400).json({ error: `Cannot cancel a ${apt.status} appointment.` });
        }

        await query(`UPDATE appointments SET status = 'cancelled' WHERE id = $1`, [id]);

        // Write dynamic audit log
        try {
            const actorName = `${req.user.first_name} ${req.user.last_name}`;
            const actorRole = req.user.role || 'owner';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['warning', actorName, actorRole, 'Cancelled veterinary appointment', `Cancelled scheduled appointment slot.`]
            );
        } catch (logErr) {
            console.error('Failed to write cancellation audit log:', logErr);
        }

        res.status(200).json({ message: 'Appointment cancelled successfully.' });
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// Reschedule an appointment
export const rescheduleAppointment = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { id } = req.params;
        const { appointment_time } = req.body;

        if (!appointment_time) {
            return res.status(400).json({ error: 'New appointment_time is required.' });
        }

        const newTime = new Date(appointment_time);
        if (isNaN(newTime.getTime()) || newTime <= new Date()) {
            return res.status(400).json({ error: 'Appointment time must be a valid future date.' });
        }

        // Verify ownership
        const checkQuery = `
            SELECT a.* FROM appointments a
            JOIN pets p ON a.pet_id = p.id
            WHERE a.id = $1 AND (p.owner_id = $2 OR a.vet_user_id = $2)
        `;
        const check = await query(checkQuery, [id, user_id]);
        if (check.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized to reschedule this appointment.' });
        }

        const apt = check.rows[0];
        if (apt.status === 'cancelled' || apt.status === 'completed') {
            return res.status(400).json({ error: `Cannot reschedule a ${apt.status} appointment.` });
        }

        await query(
            `UPDATE appointments SET appointment_time = $1, status = 'pending' WHERE id = $2`,
            [appointment_time, id]
        );

        // The old message read "An appointment has been rescheduled to
        // 8/14/2026, 6:00:00 AM" for a 09:00 Cairo appointment: toLocaleString()
        // on the server formats in the SERVER's timezone, which is UTC on
        // Vercel — a three-hour lie. It also named neither the pet nor the
        // person, so the vet could not tell which booking had moved.
        const whenStr = newTime.toLocaleString('en-US', {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo',
        });
        const petLabel = apt.pet_name || 'a pet';
        const actorIsOwner = apt.owner_id === user_id;
        const actorName = actorIsOwner
            ? (apt.owner_first_name || 'The owner')
            : ([apt.vet_first_name, apt.vet_last_name].filter(Boolean).join(' ') || 'The clinic');

        // Tell the OTHER party — whoever did not perform the reschedule.
        const notifyUserId = actorIsOwner ? apt.vet_user_id : apt.owner_id;
        if (notifyUserId) {
            await query(
                "INSERT INTO notifications (user_id, title, message, type, action_url) VALUES ($1, $2, $3, 'system', $4)",
                [
                    notifyUserId,
                    'Appointment rescheduled',
                    `${actorName} moved ${petLabel}'s appointment to ${whenStr}.`,
                    actorIsOwner ? '/pro-dashboard' : '/profile?tab=appointments',
                ]
            );
        }

        // And email them, since a notification bell is only seen if they log in.
        if (actorIsOwner) {
            // The clinic needs to know their calendar changed.
            const vetEmail = await query('SELECT email FROM users WHERE id = $1', [apt.vet_user_id]);
            if (vetEmail.rows[0]?.email) {
                sendNotificationEmail(vetEmail.rows[0].email, {
                    subject: `Appointment moved — ${whenStr}`,
                    heading: 'An appointment was rescheduled',
                    message: `${actorName} moved <strong>${petLabel}</strong>'s appointment to <strong>${whenStr}</strong>. It is pending your confirmation.`,
                    ctaLabel: 'Review Appointment',
                    ctaLink: '/pro-dashboard',
                }).catch((e) => console.error('Reschedule email failed (non-fatal):', e.message));
            }
        } else if (apt.owner_email) {
            sendNotificationEmail(apt.owner_email, {
                subject: `Appointment moved — ${whenStr}`,
                heading: 'Your appointment was rescheduled',
                message: `${actorName} moved <strong>${petLabel}</strong>'s appointment to <strong>${whenStr}</strong>.`,
                ctaLabel: 'View Appointment',
                ctaLink: '/profile?tab=appointments',
            }).catch((e) => console.error('Reschedule email failed (non-fatal):', e.message));
        }

        // Write dynamic audit log
        try {
            const actorName = `${req.user.first_name} ${req.user.last_name}`;
            const actorRole = req.user.role || 'owner';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', actorName, actorRole, 'Rescheduled veterinary appointment', `Rescheduled ${petLabel}'s appointment to ${whenStr} (Africa/Cairo).`]
            );
        } catch (logErr) {
            console.error('Failed to write rescheduling audit log:', logErr);
        }

        res.status(200).json({ message: 'Appointment rescheduled successfully.' });
    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// Admin: Get ALL appointments system-wide
export const getAllAppointments = async (req, res) => {
    try {
        const getQuery = `
            SELECT a.*, 
                   p.name as pet_name, p.species,
                   v.clinic_name,
                   owner.first_name as owner_first_name, owner.last_name as owner_last_name, owner.email as owner_email,
                   vet_user.first_name as vet_first_name, vet_user.last_name as vet_last_name
            FROM appointments a
            JOIN pets p ON a.pet_id = p.id
            JOIN users owner ON p.owner_id = owner.id
            LEFT JOIN vet_profiles v ON a.vet_user_id = v.user_id
            LEFT JOIN users vet_user ON a.vet_user_id = vet_user.id
            ORDER BY a.appointment_time DESC;
        `;
        
        const result = await query(getQuery);
        
        // Map to a flat structure the admin frontend expects
        const appointments = result.rows.map(row => ({
            ...row,
            owner_name: `${row.owner_first_name || ''} ${row.owner_last_name || ''}`.trim(),
            provider_name: row.clinic_name || `${row.vet_first_name || ''} ${row.vet_last_name || ''}`.trim(),
        }));
        
        res.status(200).json({ appointments });
    } catch (error) {
        console.error('Error fetching all appointments:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// Create a Service Booking (from Marketplace)
export const createServiceBooking = async (req, res) => {
    try {
        const client_id = req.user.id;
        const { service_id, start_time } = req.body;

        if (!service_id || !start_time) {
            return res.status(400).json({ error: 'Missing required fields: service_id, start_time' });
        }

        // Get service price to set total_price
        const serviceResult = await query('SELECT base_price FROM services WHERE id = $1', [service_id]);
        if (serviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Service not found.' });
        }
        const total_price = serviceResult.rows[0].base_price;

        // Note: end_time can be omitted if not required by DB, or set to start_time + 1 hour.
        // Let's set end_time to start_time + 1 hour just in case.
        const end_time = new Date(new Date(start_time).getTime() + 60*60*1000).toISOString();

        const insertQuery = `
            INSERT INTO service_bookings (client_id, service_id, status, start_time, end_time, total_price)
            VALUES ($1, $2, 'pending', $3, $4, $5)
            RETURNING *;
        `;
        const result = await query(insertQuery, [client_id, service_id, start_time, end_time, total_price]);

        // Get Provider ID
        const provResult = await query('SELECT provider_id FROM services WHERE id = $1', [service_id]);
        if (provResult.rows.length > 0) {
            const provider_id = provResult.rows[0].provider_id;
            await query(
                "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'system')",
                [provider_id, 'New Service Booking', `A new session has been booked for ${new Date(start_time).toLocaleString()}.`]
            );
        }

        await query(
            "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'system')",
            [client_id, 'Session Confirmed', `Your session booking for ${new Date(start_time).toLocaleString()} is confirmed.`]
        );

        // Write dynamic audit log
        try {
            const serviceQuery = await query('SELECT s.title, u.first_name, u.last_name FROM services s JOIN users u ON s.provider_id = u.id WHERE s.id = $1', [service_id]);
            const serviceName = serviceQuery.rows.length > 0 ? serviceQuery.rows[0].title : 'Service Session';
            const providerName = serviceQuery.rows.length > 0 ? `${serviceQuery.rows[0].first_name} ${serviceQuery.rows[0].last_name}` : 'Provider';
            const clientName = `${req.user.first_name} ${req.user.last_name}`;
            const clientRole = req.user.role || 'owner';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', clientName, clientRole, 'Booked veterinary appointment', `Booked service: ${serviceName} with ${providerName} for ${new Date(start_time).toLocaleString()}.`]
            );
        } catch (logErr) {
            console.error('Failed to write service booking audit log:', logErr);
        }

        res.status(201).json({ booking: result.rows[0] });
    } catch (error) {
        console.error('Error creating service booking:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// Create a guest registration and appointment in one frictionless step
export const createGuestAppointment = async (req, res) => {
    try {
        if (!(await isFeatureEnabled('vets'))) {
            return res.status(403).json({ error: VETS_COMING_SOON, feature: 'vets' });
        }
        const { first_name, last_name, email, pet_name, pet_species, vet_user_id, appointment_time, reason } = req.body;

        if (!first_name || !last_name || !email || !pet_name || !vet_user_id || !appointment_time || !reason) {
            return res.status(400).json({ error: 'Missing required guest booking fields.' });
        }

        const newTime = new Date(appointment_time);
        if (isNaN(newTime.getTime()) || newTime <= new Date()) {
            return res.status(400).json({ error: 'Appointment time must be a valid future date.' });
        }

        // Check if email already registered
        const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            return res.status(409).json({ error: 'This email is already registered. Please log in first to book.' });
        }

        // Generate temporary password
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const tempPassword = `Mewoo-${randomNum}`;

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(tempPassword, salt);

        // 1. Create the user profile (owner)
        const userInsert = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role)
             VALUES ($1, $2, $3, $4, 'owner')
             RETURNING id, email, first_name, last_name, role`,
            [email, password_hash, first_name, last_name]
        );
        const user = userInsert.rows[0];
        const userId = user.id;

        // 2. Create the pet profile
        const petInsert = await query(
            `INSERT INTO pets (owner_id, name, species)
             VALUES ($1, $2, $3)
             RETURNING id, name, species`,
            [userId, pet_name, pet_species || 'Dog']
        );
        const pet = petInsert.rows[0];
        const petId = pet.id;

        // 3. Create the appointment
        const aptInsert = await query(
            `INSERT INTO appointments (pet_id, vet_user_id, appointment_time, reason)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [petId, vet_user_id, appointment_time, reason]
        );
        const appointment = aptInsert.rows[0];

        // 4. Notifications
        await query(
            "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'system')",
            [vet_user_id, 'New Appointment Request (Guest)', `A new appointment has been requested by guest ${first_name} for ${new Date(appointment_time).toLocaleString()}.`]
        );
        await query(
            "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'system')",
            [userId, 'Welcome to PetPulse', `Your account has been created! Use password: ${tempPassword} to log in later.`]
        );

        // Write dynamic audit log
        try {
            const vetCheck = await query('SELECT first_name, last_name FROM users WHERE id = $1', [vet_user_id]);
            const vetName = vetCheck.rows.length > 0 ? `${vetCheck.rows[0].first_name} ${vetCheck.rows[0].last_name}` : 'Veterinarian';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', `${first_name} ${last_name}`, 'owner', 'Booked veterinary appointment', `Scheduled guest slot with ${vetName}.`]
            );
        } catch (logErr) {
            console.error('Failed to write guest appointment audit log:', logErr);
        }

        // 5. Generate JWT token
        const payload = {
            id: userId,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            profile_pic_url: null
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            token,
            user: payload,
            temporary_password: tempPassword,
            email: email,
            appointment
        });
    } catch (error) {
        console.error('Error in createGuestAppointment:', error);
        res.status(500).json({ error: 'Failed to process guest checkout appointment.' });
    }
};

