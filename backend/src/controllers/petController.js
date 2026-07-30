import { query } from '../config/db.js';
import { getCompatClient } from '../ai/llmClient.js';

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

        res.status(200).json({ message: 'Pet deleted successfully.' });
    } catch (error) {
        console.error('Error deleting pet:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const uploadMedicalRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { document_url } = req.body; // Expected to be a Cloudinary URL uploaded client-side.

        if (!document_url || typeof document_url !== 'string') {
            return res.status(400).json({ error: 'Document URL is required.' });
        }
        // Validate the URL: http(s) only, within the column length.
        let parsed;
        try { parsed = new URL(document_url); } catch { return res.status(400).json({ error: 'Invalid document URL.' }); }
        if (!['http:', 'https:'].includes(parsed.protocol) || document_url.length > 512) {
            return res.status(400).json({ error: 'Document URL must be a valid http(s) link under 512 characters.' });
        }

        // Authz: the pet must belong to the authenticated user (never trust the caller).
        const petCheck = await query('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [id, req.user.id]);
        if (petCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }

        const prompt = `You are a veterinary AI assistant. Extract and structure the medical data from the document text below into JSON.
Return ONLY a JSON object matching this schema:
{
  "vaccines": [{"name": "Rabies", "date": "2024-01-01"}],
  "allergies": ["dust", "chicken"],
  "past_surgeries": ["spay"],
  "notes": "Any other important medical notes"
}

Document reference: ${document_url}`;

        // NOTE: real OCR/text extraction from the document is a follow-up (pdf-parse/
        // Tesseract). Until then the AI summary is stored as UNVERIFIED and must not be
        // treated as clinical fact.
        let summary = { vaccines: [], allergies: [], past_surgeries: [], notes: '' };
        let extracted_text = 'Pending text extraction';
        let verified = false;

        const ai = getCompatClient();
        if (!ai.isMock) {
            try {
                const response = await ai.client.chat.completions.create({
                    model: ai.model,
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                });
                summary = JSON.parse(response.choices[0].message.content.trim());
                extracted_text = 'Structured by AI (unverified — no OCR yet)';
            } catch (aiErr) {
                console.warn('Medical extraction AI failed, storing empty summary:', aiErr.message);
            }
        }

        const insertQuery = `
            INSERT INTO medical_records (pet_id, document_url, extracted_text, summary)
            VALUES ($1, $2, $3, $4::jsonb)
            RETURNING *;
        `;
        const result = await query(insertQuery, [id, document_url, extracted_text, JSON.stringify(summary)]);

        res.status(201).json({
            message: 'Medical record uploaded. AI summary is unverified — please review.',
            verified,
            record: result.rows[0]
        });

    } catch (error) {
        console.error('Error processing medical record:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

/**
 * Record a vaccination/deworming for a pet. If due_at isn't supplied it is derived
 * from given_at + a standard interval (deworming +3 months, else +1 year). This is
 * what feeds the Autopilot vaccination reminder job.
 * POST /api/pets/:id/vaccinations
 */
export const addVaccination = async (req, res) => {
    try {
        const { id } = req.params;
        const owner_id = req.user.id;
        const vaccine_name = String(req.body?.vaccine_name || '').trim();
        if (!vaccine_name || vaccine_name.length > 120) {
            return res.status(400).json({ error: 'A vaccine/treatment name (under 120 characters) is required.' });
        }

        // Authz: pet must belong to the caller.
        const petCheck = await query('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [id, owner_id]);
        if (petCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }

        const parseDate = (v) => {
            if (!v) return null;
            const d = new Date(v);
            return isNaN(d.getTime()) ? undefined : d; // undefined = provided-but-invalid
        };
        const givenAt = parseDate(req.body?.given_at);
        if (givenAt === undefined) return res.status(400).json({ error: 'given_at must be a valid date (YYYY-MM-DD).' });

        let dueAt = parseDate(req.body?.due_at);
        if (dueAt === undefined) return res.status(400).json({ error: 'due_at must be a valid date (YYYY-MM-DD).' });
        if (!dueAt) {
            // Derive: deworming repeats ~every 3 months; most vaccines are annual.
            const base = givenAt || new Date();
            const isDeworm = /deworm|worm/i.test(vaccine_name);
            dueAt = new Date(base.getTime() + (isDeworm ? 90 : 365) * 86400000);
        }

        const givenStr = givenAt ? givenAt.toISOString().slice(0, 10) : null;
        const dueStr = dueAt.toISOString().slice(0, 10);

        const result = await query(
            `INSERT INTO vaccinations (pet_id, vaccine_name, given_at, due_at, status)
             VALUES ($1, $2, $3, $4, 'due')
             RETURNING id, vaccine_name, given_at, due_at, status`,
            [id, vaccine_name, givenStr, dueStr]
        );
        res.status(201).json({ message: "Vaccination saved — you'll get a reminder before it's due.", vaccination: result.rows[0] });
    } catch (error) {
        console.error('Error adding vaccination:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

/** List a pet's vaccination/deworming records (owner only). GET /api/pets/:id/vaccinations */
export const getVaccinations = async (req, res) => {
    try {
        const { id } = req.params;
        const petCheck = await query('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [id, req.user.id]);
        if (petCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Pet not found or unauthorized' });
        }
        const result = await query(
            `SELECT id, vaccine_name, given_at, due_at, status
               FROM vaccinations WHERE pet_id = $1 ORDER BY due_at ASC`,
            [id]
        );
        res.status(200).json({ vaccinations: result.rows });
    } catch (error) {
        console.error('Error fetching vaccinations:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
