import { query } from '../config/db.js';

export const createService = async (req, res) => {
    try {
        const { title, description, category, base_price } = req.body;
        const provider_id = req.user.id;

        if (!title || !category || !base_price) {
            return res.status(400).json({ error: 'Missing required fields: title, category, base_price' });
        }

        const insertQuery = `
            INSERT INTO services (provider_id, title, description, category, base_price)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const result = await query(insertQuery, [provider_id, title, description, category, base_price]);

        res.status(201).json({ service: result.rows[0] });
    } catch (error) {
        console.error('Error creating service:', error);
        // Check for foreign key violation for trainer_profiles
        if (error.code === '23503') {
            return res.status(403).json({ error: 'User must have a trainer profile to create a service' });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const getServices = async (req, res) => {
    try {
        const { category } = req.query;
        let queryStr = 'SELECT * FROM services WHERE is_active = true';
        const queryParams = [];

        if (category) {
            queryStr += ' AND category = $1';
            queryParams.push(category);
        }

        queryStr += ' ORDER BY created_at DESC';

        const result = await query(queryStr, queryParams);
        res.status(200).json({ services: result.rows });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM services WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }

        res.status(200).json({ service: result.rows[0] });
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const provider_id = req.user.id;
        const { title, description, category, base_price, is_active } = req.body;

        // Ensure the service belongs to the provider
        const checkResult = await query('SELECT id FROM services WHERE id = $1 AND provider_id = $2', [id, provider_id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Service not found or unauthorized' });
        }

        const updateQuery = `
            UPDATE services
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                base_price = COALESCE($4, base_price),
                is_active = COALESCE($5, is_active)
            WHERE id = $6
            RETURNING *;
        `;
        const result = await query(updateQuery, [title, description, category, base_price, is_active, id]);

        res.status(200).json({ service: result.rows[0] });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
