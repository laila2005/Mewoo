import { query } from '../config/db.js';
import { scoreLostFoundMatch, tokenSet } from '../utils/matchScore.js';
import { notifyUser } from '../services/notificationService.js';

/**
 * Agentic neighbourhood alert: when a pet goes missing, rally nearby owners.
 * We have no reliable lat/lng in prod (no map picker yet), so we match on the
 * text area — significant tokens of the last-seen location against each owner's
 * pet location / saved neighbourhood. Best-effort and capped so it never spams
 * or blocks the report. Excludes the reporter.
 */
async function alertNeighbours({ lost_pet_id, reporter_id, pet_name, species, area }) {
  try {
    const tokens = [...tokenSet(area)].filter(t => t.length >= 3).slice(0, 4);
    if (!tokens.length) return 0;
    const likeConds = tokens
      .map((_, i) => `(p.location ILIKE $${i + 2} OR u.neighborhood ILIKE $${i + 2})`)
      .join(' OR ');
    const params = [reporter_id, ...tokens.map(t => `%${t}%`)];
    const { rows: neighbours } = await query(
      `SELECT DISTINCT u.id, u.email, u.first_name
         FROM users u
         JOIN pets p ON p.owner_id = u.id
        WHERE (${likeConds}) AND u.id <> $1
        LIMIT 40`,
      params
    );
    for (const n of neighbours) {
      await notifyUser(n.id, {
        type: 'lost_found',
        title: `🐾 A ${species || 'pet'} went missing near you`,
        message: `${pet_name || 'A pet'} was last seen around ${area}. If you spot them, open the report and leave a sighting — every extra pair of eyes helps.`,
        action_url: '/community#lostfound',
        email: n.email,
      });
    }
    return neighbours.length;
  } catch (e) {
    console.warn('[lostfound] neighbour alert failed (non-critical):', e.message);
    return 0;
  }
}

export const reportLostPet = async (req, res) => {
    try {
        const { pet_name, species, breed, last_seen_location, description, image_url, contact_phone, pet_id, photos, contact_pref } = req.body;
        const reporter_id = req.user.id;

        // Sanitize photo URLs — Cloudinary origin only, max 6.
        const CLOUD_RE = /^https:\/\/res\.cloudinary\.com\//;
        const photoList = Array.isArray(photos)
            ? photos.filter(u => typeof u === 'string' && CLOUD_RE.test(u)).slice(0, 6)
            : [];
        // Cover image: an explicit image_url, else the first uploaded photo.
        const cover = (typeof image_url === 'string' && CLOUD_RE.test(image_url)) ? image_url : (photoList[0] || null);
        // How the owner wants to be reached. Default to both.
        const pref = ['message', 'call', 'both'].includes(contact_pref) ? contact_pref : 'both';

        const insertQuery = `
            INSERT INTO lost_pets (pet_name, species, breed, last_seen_location, description, image_url, photos, contact_phone, reporter_id, pet_id, contact_pref)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)
            RETURNING *;
        `;
        const result = await query(insertQuery, [
            pet_name, species, breed || null, last_seen_location, description || null,
            cover, JSON.stringify(photoList), contact_phone || null, reporter_id, pet_id || null, pref
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

        // Agentic assist: rally nearby owners to watch out (best-effort, non-blocking).
        const neighboursAlerted = await alertNeighbours({
            lost_pet_id: report.id,
            reporter_id,
            pet_name,
            species,
            area: last_seen_location,
        });

        res.status(201).json({ report, neighbours_alerted: neighboursAlerted });
    } catch (error) {
        console.error('Error reporting lost pet:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getLostPets = async (req, res) => {
    try {
        const result = await query(`
            SELECT lp.*, u.first_name, u.last_name, u.profile_pic_url,
                   (SELECT COUNT(*)::int FROM pet_sightings s WHERE s.lost_pet_id = lp.id) AS sighting_count
            FROM lost_pets lp
            LEFT JOIN users u ON u.id = lp.reporter_id
            ORDER BY lp.created_at DESC
        `);

        const reports = result.rows.map(r => {
            // Never expose the raw phone in the public list — it would be trivially
            // scrapeable. Callers reveal it one number at a time via the rate-limited
            // /reveal-phone endpoint. Messaging always goes through reporter_id.
            const { contact_phone, ...safe } = r;
            const pref = r.contact_pref || 'both';
            return {
                ...safe,
                user_name: r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : 'Anonymous',
                user_avatar: r.profile_pic_url || null,
                contact_pref: pref,
                has_phone: !!contact_phone && pref !== 'message',
            };
        });

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
                const pref = r.contact_pref || 'both';
                return {
                    id: r.id, pet_name: r.pet_name, species: r.species, breed: r.breed,
                    last_seen_location: r.last_seen_location, description: r.description,
                    image_url: r.image_url, photos: r.photos || [], created_at: r.created_at,
                    reporter_id: r.reporter_id,
                    reporter_name: r.first_name ? `${r.first_name} ${r.last_name || ''}`.trim() : 'Anonymous',
                    contact_pref: pref, has_phone: !!r.contact_phone && pref !== 'message',
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

/**
 * AUTHED: reveal a lost-pet reporter's phone number, one at a time.
 * Anti-spam: numbers are never in the public list; a logged-in viewer may reveal
 * at most REVEAL_LIMIT distinct numbers per rolling hour, and every reveal is
 * logged. The owner's own number is always visible to them with no limit, and a
 * 'message'-only preference blocks reveals entirely.
 */
const REVEAL_LIMIT = 10;
export const revealPhone = async (req, res) => {
    try {
        const viewerId = req.user.id;
        const { id } = req.params;

        const { rows } = await query(
            `SELECT contact_phone, contact_pref, reporter_id FROM lost_pets WHERE id = $1`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Report not found.' });
        const report = rows[0];

        if (!report.contact_phone) {
            return res.status(404).json({ error: 'This owner did not add a phone number. Try messaging them in-app.' });
        }

        // The reporter can always see their own number.
        if (report.reporter_id === viewerId) {
            return res.status(200).json({ phone: report.contact_phone });
        }

        if ((report.contact_pref || 'both') === 'message') {
            return res.status(403).json({ error: 'This owner prefers in-app messages only.' });
        }

        // Rate-limit distinct reveals per viewer over a rolling hour.
        const { rows: cnt } = await query(
            `SELECT COUNT(*)::int AS n FROM lost_pet_phone_reveals
             WHERE viewer_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
            [viewerId]
        );
        if (cnt[0].n >= REVEAL_LIMIT) {
            return res.status(429).json({
                error: 'You have revealed several numbers in the last hour. Please message owners in-app for now, or try again later.'
            });
        }

        await query(
            `INSERT INTO lost_pet_phone_reveals (viewer_id, lost_pet_id) VALUES ($1, $2)`,
            [viewerId, id]
        );

        res.status(200).json({ phone: report.contact_phone });
    } catch (error) {
        console.error('Error revealing phone:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

const CLOUD_RE = /^https:\/\/res\.cloudinary\.com\//;

/**
 * AUTHED: a neighbour reports spotting a lost pet. Records the sighting and
 * pings the owner in real time — "what neighbours say". Owners can't file a
 * sighting on their own report.
 */
export const addSighting = async (req, res) => {
    try {
        const viewerId = req.user.id;
        const { id } = req.params;
        const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 1000) : null;
        const location = typeof req.body?.location === 'string' ? req.body.location.trim().slice(0, 300) : null;
        const photo_url = (typeof req.body?.photo_url === 'string' && CLOUD_RE.test(req.body.photo_url)) ? req.body.photo_url : null;

        const { rows } = await query(
            `SELECT lp.id, lp.pet_name, lp.reporter_id, u.email AS owner_email
               FROM lost_pets lp LEFT JOIN users u ON u.id = lp.reporter_id
              WHERE lp.id = $1`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Report not found.' });
        const report = rows[0];
        if (report.reporter_id === viewerId) {
            return res.status(400).json({ error: "That's your own report — sightings come from other people." });
        }

        const ins = await query(
            `INSERT INTO pet_sightings (lost_pet_id, reporter_id, note, location, photo_url)
             VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
            [id, viewerId, note, location, photo_url]
        );

        // Ping the owner (in-app + email).
        if (report.reporter_id) {
            const spotter = `${req.user.first_name || 'Someone'}`.trim();
            const where = location ? ` near ${location}` : '';
            await notifyUser(report.reporter_id, {
                type: 'lost_found',
                title: `👀 Possible sighting of ${report.pet_name || 'your pet'}`,
                message: `${spotter} reported spotting ${report.pet_name || 'your pet'}${where}.${note ? ` "${note}"` : ''} Open the report to see details and reach out.`,
                action_url: '/community#lostfound',
                email: report.owner_email,
            });
        }

        const { rows: cnt } = await query(`SELECT COUNT(*)::int AS n FROM pet_sightings WHERE lost_pet_id = $1`, [id]);
        res.status(201).json({ sighting: ins.rows[0], count: cnt[0].n });
    } catch (error) {
        console.error('Error adding sighting:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

/**
 * PUBLIC: recent sightings for a lost report ("what neighbours say").
 * Only the spotter's first name is exposed.
 */
export const getSightings = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await query(
            `SELECT s.id, s.note, s.location, s.photo_url, s.created_at, u.first_name AS spotter_name
               FROM pet_sightings s LEFT JOIN users u ON u.id = s.reporter_id
              WHERE s.lost_pet_id = $1
              ORDER BY s.created_at DESC
              LIMIT 50`,
            [id]
        );
        res.status(200).json({ sightings: rows, count: rows.length });
    } catch (error) {
        console.error('Error fetching sightings:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
