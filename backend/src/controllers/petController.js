import { query } from '../config/db.js';

export const createPet = async (req, res) => {
    try {
        const { name, species, breed, age_years, weight_kg, avatar_url, bio, is_adoptable, is_mating, gender, location } = req.body;
        const owner_id = req.user.id;

        if (!name || !species) {
            return res.status(400).json({ error: 'Name and species are required' });
        }

        const insertQuery = `
            INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, avatar_url, bio, is_adoptable, is_mating, gender, location)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `;
        const result = await query(insertQuery, [
            owner_id, 
            name, 
            species, 
            breed, 
            age_years ? Math.round(parseFloat(age_years)) : null, 
            weight_kg || null, 
            avatar_url, 
            bio || '', 
            is_adoptable || false, 
            is_mating || false,
            gender || null,
            location || null
        ]);

        const pet = result.rows[0];

        // Write dynamic audit log
        try {
            const ownerName = `${req.user.first_name} ${req.user.last_name}`;
            const ownerRole = req.user.role || 'owner';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', ownerName, ownerRole, 'Registered a new pet profile', `Added ${name} (${species} - ${breed || 'Mixed'}, ${age_years ? age_years + ' years old' : 'age unknown'}).`]
            );
        } catch (logErr) {
            console.error('Failed to write pet registration audit log:', logErr);
        }

        res.status(201).json({ pet });
    } catch (error) {
        console.error('Error creating pet:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getPets = async (req, res) => {
    try {
        const owner_id = req.user.id;
        const result = await query('SELECT * FROM pets WHERE owner_id = $1 ORDER BY created_at DESC', [owner_id]);
        res.status(200).json({ pets: result.rows });
    } catch (error) {
        console.error('Error fetching pets:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getAdoptablePets = async (req, res) => {
    try {
        const result = await query('SELECT * FROM pets WHERE is_adoptable = TRUE ORDER BY created_at DESC');
        res.status(200).json({ pets: result.rows });
    } catch (error) {
        console.error('Error fetching adoptable pets:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getMatingPets = async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.*,
                u.first_name as owner_first_name,
                u.last_name as owner_last_name,
                u.profile_pic_url as owner_profile_pic
            FROM pets p
            JOIN users u ON p.owner_id = u.id
            WHERE p.is_mating = TRUE
            ORDER BY p.created_at DESC
        `;
        const result = await query(sql);
        res.status(200).json({ pets: result.rows });
    } catch (error) {
        console.error('Error fetching mating pets:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getPetById = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT 
                p.*,
                u.first_name as owner_first_name,
                u.last_name as owner_last_name,
                u.id as owner_id
            FROM pets p
            JOIN users u ON p.owner_id = u.id
            WHERE p.id = $1
        `;
        const result = await query(sql, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pet not found' });
        }

        res.status(200).json({ pet: result.rows[0] });
    } catch (error) {
        console.error('Error fetching pet:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const updatePet = async (req, res) => {
    try {
        const { id } = req.params;
        const owner_id = req.user.id;
        const { name, species, breed, age_years, weight_kg, avatar_url, bio, is_adoptable, is_mating, gender, location } = req.body;

        // Ensure the pet belongs to the user
        const checkResult = await query('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [id, owner_id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }

        const updates = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
        if (species !== undefined) { updates.push(`species = $${idx++}`); values.push(species); }
        if (breed !== undefined) { updates.push(`breed = $${idx++}`); values.push(breed); }
        if (age_years !== undefined) { 
            updates.push(`age_years = $${idx++}`); 
            values.push(age_years !== null ? Math.round(parseFloat(age_years)) : null); 
        }
        if (weight_kg !== undefined) { updates.push(`weight_kg = $${idx++}`); values.push(weight_kg); }
        if (avatar_url !== undefined) { updates.push(`avatar_url = $${idx++}`); values.push(avatar_url); }
        if (bio !== undefined) { updates.push(`bio = $${idx++}`); values.push(bio); }
        if (is_adoptable !== undefined) { updates.push(`is_adoptable = $${idx++}`); values.push(is_adoptable); }
        if (is_mating !== undefined) { updates.push(`is_mating = $${idx++}`); values.push(is_mating); }
        if (gender !== undefined) { updates.push(`gender = $${idx++}`); values.push(gender); }
        if (location !== undefined) { updates.push(`location = $${idx++}`); values.push(location); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        const updateQuery = `
            UPDATE pets
            SET ${updates.join(', ')}
            WHERE id = $${idx}
            RETURNING *;
        `;
        const result = await query(updateQuery, values);

        const updatedPet = result.rows[0];

        // Write dynamic audit log if now listed for mating
        if (is_mating === true) {
            try {
                const ownerName = `${req.user.first_name} ${req.user.last_name}`;
                const ownerRole = req.user.role || 'owner';
                await query(
                    `INSERT INTO audit_logs (level, user_name, role, action, details) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    ['info', ownerName, ownerRole, 'Published a new mating resume', `Registered mating profile details for pet ${updatedPet.name}.`]
                );
            } catch (logErr) {
                console.error('Failed to write mating profile audit log:', logErr);
            }
        }

        res.status(200).json({ pet: updatedPet });
    } catch (error) {
        console.error('Error updating pet:', error);
        res.status(500).json({ error: 'Something went wrong.' });
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
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
