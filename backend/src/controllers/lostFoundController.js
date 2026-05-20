import { query } from '../config/db.js';

export const reportLostPet = async (req, res) => {
    try {
        const { pet_name, species, breed, last_seen_location, description, image_url, contact_phone, pet_id } = req.body;
        const reporter_id = req.user.id;

        const insertQuery = `
            INSERT INTO lost_pets (pet_name, species, breed, last_seen_location, description, image_url, contact_phone, reporter_id, pet_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
        `;
        const result = await query(insertQuery, [
            pet_name, species, breed || null, last_seen_location, description || null,
            image_url || null, contact_phone || null, reporter_id, pet_id || null
        ]);

        res.status(201).json({ report: result.rows[0] });
    } catch (error) {
        console.error('Error reporting lost pet:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getLostPets = async (req, res) => {
    try {
        const result = await query(`
            SELECT lp.*, u.first_name, u.last_name, u.profile_pic_url
            FROM lost_pets lp
            LEFT JOIN users u ON u.id = lp.reporter_id
            ORDER BY lp.created_at DESC
        `);

        const reports = result.rows.map(r => ({
            ...r,
            user_name: r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : 'Anonymous',
            user_avatar: r.profile_pic_url || null
        }));

        res.status(200).json({ reports });
    } catch (error) {
        console.error('Error fetching lost pets:', error);
        res.status(500).json({ error: 'Something went wrong.' });
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
            RETURNING *;
        `;
        const result = await query(updateQuery, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lost pet report not found' });
        }

        res.status(200).json({ report: result.rows[0] });
    } catch (error) {
        console.error('Error updating lost pet status:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const reportFoundPet = async (req, res) => {
    try {
        const { lost_pet_id, description, location, image_url, contact_phone } = req.body;
        const reporter_id = req.user.id;

        const insertQuery = `
            INSERT INTO found_reports (reporter_id, lost_pet_id, description, image_url, found_time, latitude, longitude)
            VALUES ($1, $2, $3, $4, NOW(), 0, 0)
            RETURNING *;
        `;
        const result = await query(insertQuery, [
            reporter_id, lost_pet_id || null, description || null, image_url || null
        ]);

        res.status(201).json({ report: result.rows[0] });
    } catch (error) {
        console.error('Error reporting found pet:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getFoundReports = async (req, res) => {
    try {
        const result = await query(`
            SELECT fr.*, u.first_name, u.last_name, u.profile_pic_url
            FROM found_reports fr
            LEFT JOIN users u ON u.id = fr.reporter_id
            ORDER BY fr.created_at DESC
        `);

        const reports = result.rows.map(r => ({
            ...r,
            user_name: r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : 'Anonymous',
            user_avatar: r.profile_pic_url || null
        }));

        res.status(200).json({ reports });
    } catch (error) {
        console.error('Error fetching found reports:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
