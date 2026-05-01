import { query } from '../config/db.js';

export const reportLostPet = async (req, res) => {
    try {
        const { pet_id, latitude, longitude, lost_time, description } = req.body;
        
        if (!pet_id || !latitude || !longitude || !lost_time) {
            return res.status(400).json({ error: 'Missing required fields: pet_id, latitude, longitude, lost_time' });
        }

        // Use standard float coordinates
        const insertQuery = `
            INSERT INTO lost_pets (pet_id, latitude, longitude, lost_time, description)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, pet_id, status, longitude, latitude, lost_time, description, created_at;
        `;
        const result = await query(insertQuery, [pet_id, longitude, latitude, lost_time, description]);

        res.status(201).json({ lost_pet: result.rows[0] });
    } catch (error) {
        console.error('Error reporting lost pet:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getLostPets = async (req, res) => {
    try {
        const result = await query(`
            SELECT id, pet_id, status, longitude, latitude, lost_time, description, created_at 
            FROM lost_pets 
            WHERE status = 'lost'
            ORDER BY created_at DESC
        `);
        res.status(200).json({ lost_pets: result.rows });
    } catch (error) {
        console.error('Error fetching lost pets:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateLostPetStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const updateQuery = `
            UPDATE lost_pets
            SET status = $1
            WHERE id = $2
            RETURNING id, pet_id, status;
        `;
        const result = await query(updateQuery, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lost pet report not found' });
        }

        res.status(200).json({ lost_pet: result.rows[0] });
    } catch (error) {
        console.error('Error updating lost pet status:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const reportFoundPet = async (req, res) => {
    try {
        const { lost_pet_id, latitude, longitude, found_time, description, image_url } = req.body;
        const reporter_id = req.user.id;

        if (!latitude || !longitude || !found_time) {
            return res.status(400).json({ error: 'Missing required fields: latitude, longitude, found_time' });
        }

        const insertQuery = `
            INSERT INTO found_reports (reporter_id, lost_pet_id, latitude, longitude, found_time, description, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, reporter_id, lost_pet_id, status, longitude, latitude, found_time, description, image_url, created_at;
        `;
        const result = await query(insertQuery, [reporter_id, lost_pet_id || null, latitude, longitude, found_time, description, image_url]);

        res.status(201).json({ found_report: result.rows[0] });
    } catch (error) {
        console.error('Error reporting found pet:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getFoundReports = async (req, res) => {
    try {
        const result = await query(`
            SELECT id, reporter_id, lost_pet_id, status, longitude, latitude, found_time, description, image_url, created_at
            FROM found_reports
            WHERE status = 'open'
            ORDER BY created_at DESC
        `);
        res.status(200).json({ found_reports: result.rows });
    } catch (error) {
        console.error('Error fetching found reports:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
