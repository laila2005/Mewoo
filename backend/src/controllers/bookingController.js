import { query } from '../config/db.js';

// Create a new vet appointment
export const createAppointment = async (req, res) => {
    try {
        // The user ID comes from the authenticated token
        const user_id = req.user.id;
        const { vet_user_id, appointment_time, reason, pet_id } = req.body;

        if (!vet_user_id || !appointment_time || !reason) {
            return res.status(400).json({ error: 'Missing required fields: vet_user_id, appointment_time, reason' });
        }

        // If pet_id is not provided, we will try to find the user's first pet or create a default one.
        // The schema requires a pet_id. Since the UI might not have a pet selector yet, let's auto-handle this.
        let final_pet_id = pet_id;
        if (!final_pet_id) {
            const petResult = await query('SELECT id FROM pets WHERE owner_id = $1 LIMIT 1', [user_id]);
            if (petResult.rows.length > 0) {
                final_pet_id = petResult.rows[0].id;
            } else {
                // Create a default pet for the user if they don't have one
                const newPet = await query(
                    'INSERT INTO pets (owner_id, name, species) VALUES ($1, $2, $3) RETURNING id',
                    [user_id, 'My Pet', 'Unknown']
                );
                final_pet_id = newPet.rows[0].id;
            }
        }

        const insertQuery = `
            INSERT INTO appointments (pet_id, vet_user_id, appointment_time, reason)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const result = await query(insertQuery, [final_pet_id, vet_user_id, appointment_time, reason]);

        res.status(201).json({ appointment: result.rows[0] });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'Server error' });
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
        res.status(500).json({ error: 'Server error' });
    }
};
