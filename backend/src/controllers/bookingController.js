import { query } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendNotificationEmail } from '../services/emailService.js';

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

// Create a new vet appointment
export const createAppointment = async (req, res) => {
    try {
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
        const checkQuery = `
            SELECT a.* FROM appointments a
            JOIN pets p ON a.pet_id = p.id
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

        // Notify the vet
        await query(
            "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'system')",
            [apt.vet_user_id, 'Appointment Rescheduled', `An appointment has been rescheduled to ${newTime.toLocaleString()}.`]
        );

        // Write dynamic audit log
        try {
            const actorName = `${req.user.first_name} ${req.user.last_name}`;
            const actorRole = req.user.role || 'owner';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', actorName, actorRole, 'Rescheduled veterinary appointment', `Rescheduled appointment slot to ${newTime.toLocaleString()}.`]
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
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

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

