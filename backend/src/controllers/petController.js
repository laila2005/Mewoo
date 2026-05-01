import { query } from '../config/db.js';

export const createPet = async (req, res) => {
    try {
        const { name, species, breed, age_years, weight_kg, avatar_url } = req.body;
        const owner_id = req.user.id;

        if (!name || !species) {
            return res.status(400).json({ error: 'Name and species are required' });
        }

        const insertQuery = `
            INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, avatar_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const result = await query(insertQuery, [owner_id, name, species, breed, age_years, weight_kg, avatar_url]);

        res.status(201).json({ pet: result.rows[0] });
    } catch (error) {
        console.error('Error creating pet:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getPets = async (req, res) => {
    try {
        const owner_id = req.user.id;
        const result = await query('SELECT * FROM pets WHERE owner_id = $1 ORDER BY created_at DESC', [owner_id]);
        res.status(200).json({ pets: result.rows });
    } catch (error) {
        console.error('Error fetching pets:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getPetById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM pets WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pet not found' });
        }

        res.status(200).json({ pet: result.rows[0] });
    } catch (error) {
        console.error('Error fetching pet:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updatePet = async (req, res) => {
    try {
        const { id } = req.params;
        const owner_id = req.user.id;
        const { name, species, breed, age_years, weight_kg, avatar_url } = req.body;

        // Ensure the pet belongs to the user
        const checkResult = await query('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [id, owner_id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }

        const updateQuery = `
            UPDATE pets
            SET name = COALESCE($1, name),
                species = COALESCE($2, species),
                breed = COALESCE($3, breed),
                age_years = COALESCE($4, age_years),
                weight_kg = COALESCE($5, weight_kg),
                avatar_url = COALESCE($6, avatar_url)
            WHERE id = $7
            RETURNING *;
        `;
        const result = await query(updateQuery, [name, species, breed, age_years, weight_kg, avatar_url, id]);

        res.status(200).json({ pet: result.rows[0] });
    } catch (error) {
        console.error('Error updating pet:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deletePet = async (req, res) => {
    try {
        const { id } = req.params;
        const owner_id = req.user.id;

        const result = await query('DELETE FROM pets WHERE id = $1 AND owner_id = $2 RETURNING id', [id, owner_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }

        res.status(200).json({ message: 'Pet deleted successfully' });
    } catch (error) {
        console.error('Error deleting pet:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
