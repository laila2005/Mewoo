import { query } from '../config/db.js';
import { scoreLostFoundMatch } from '../utils/matchScore.js';

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

        const report = result.rows[0];

        // Write dynamic audit log
        try {
            const reporterName = `${req.user.first_name} ${req.user.last_name}`;
            const reporterRole = req.user.role || 'owner';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', reporterName, reporterRole, 'Reported lost pet', `Filed emergency report for ${pet_name} last seen at ${last_seen_location}.`]
            );
        } catch (logErr) {
            console.error('Failed to write lost pet report audit log:', logErr);
        }

        res.status(201).json({ report });
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
            WHERE id = $2 AND reporter_id = $3
            RETURNING *;
        `;
        const result = await query(updateQuery, [status, id, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lost pet report not found' });
        }

        // Write dynamic audit log
        try {
            const reporterName = `${req.user.first_name} ${req.user.last_name}`;
            const reporterRole = req.user.role || 'owner';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['success', reporterName, reporterRole, 'Updated lost pet status', `Marked lost pet report #${id} as ${status}.`]
            );
        } catch (logErr) {
            console.error('Failed to write lost pet update audit log:', logErr);
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

        const report = result.rows[0];

        // Write dynamic audit log
        try {
            const reporterName = `${req.user.first_name} ${req.user.last_name}`;
            const reporterRole = req.user.role || 'owner';
            let detailMsg = `Submitted pet recovery sighting details.`;
            if (lost_pet_id) {
                const petResult = await query('SELECT pet_name FROM lost_pets WHERE id = $1', [lost_pet_id]);
                if (petResult.rows.length > 0) {
                    detailMsg = `Submitted recovery sighting for lost pet ${petResult.rows[0].pet_name}.`;
                }
            }
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['success', reporterName, reporterRole, 'Reported found pet sighting', detailMsg]
            );
        } catch (logErr) {
            console.error('Failed to write found pet sighting audit log:', logErr);
        }

        res.status(201).json({ report });
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

/**
 * PUBLIC: rank open lost-pet reports against a found sighting or a search.
 * Body: { species, breed, area|location, description, date }
 * Deterministic scoring (never a definitive match) — returns top possible matches
 * with a score + human-readable reasons + the reporter's contact info.
 */
export const matchLostPets = async (req, res) => {
    try {
        const q = {
            species: req.body?.species,
            breed: req.body?.breed,
            area: req.body?.area || req.body?.location,
            description: req.body?.description,
            date: req.body?.date,
        };
        const { rows } = await query(`
            SELECT lp.*, u.first_name, u.last_name
            FROM lost_pets lp
            LEFT JOIN users u ON u.id = lp.reporter_id
            WHERE lp.status = 'lost'
            ORDER BY lp.created_at DESC
            LIMIT 200
        `);
        const matches = rows
            .map(r => {
                const { score, reasons } = scoreLostFoundMatch(r, q);
                return {
                    id: r.id, pet_name: r.pet_name, species: r.species, breed: r.breed,
                    last_seen_location: r.last_seen_location, description: r.description,
                    image_url: r.image_url, contact_phone: r.contact_phone, created_at: r.created_at,
                    reporter_name: r.first_name ? `${r.first_name} ${r.last_name || ''}`.trim() : 'Anonymous',
                    match_score: score, match_reasons: reasons,
                };
            })
            .filter(m => m.match_score >= 30)
            .sort((a, b) => b.match_score - a.match_score)
            .slice(0, 10);
        res.status(200).json({ matches, count: matches.length });
    } catch (error) {
        console.error('Error matching lost pets:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
