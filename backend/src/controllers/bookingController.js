import { query } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Create a new vet appointment
export const createAppointment = async (req, res) => {
    try {
        // The user ID comes from the authenticated token
        const user_id = req.user.id;
        const { vet_user_id, appointment_time, reason, pet_id } = req.body;

        if (!vet_user_id || !appointment_time || !reason) {
            return res.status(400).json({ error: 'Missing required fields: vet_user_id, appointment_time, reason' });
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

        // Notify the Vet
        await query(
            "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'system')",
            [vet_user_id, 'New Appointment Request', `A new appointment has been requested for ${new Date(appointment_time).toLocaleString()}.`]
        );

        // Notify the Client
        await query(
            "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'system')",
            [user_id, 'Appointment Confirmed', `Your appointment request for ${new Date(appointment_time).toLocaleString()} has been received.`]
        );

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
            SELECT a.*, p.name as pet_name, p.species, v.clinic_name 
            FROM appointments a
            JOIN pets p ON a.pet_id = p.id
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

