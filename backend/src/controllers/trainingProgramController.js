import { query } from '../config/db.js';

/**
 * PetPulse — Trainer training programs (Phases 2-4 of the trainer roadmap):
 * programs/enrollment, group classes with a roster + waitlist, and
 * trainer-authored progress notes visible to the enrolled owner.
 *
 * `capacity` is what makes one data model serve two phases: NULL is a
 * traditional 1:1 program (no cap), a number turns the same row into a group
 * class. Enrollment past capacity waitlists instead of failing outright, and
 * a cancellation promotes the oldest waitlisted enrollment automatically.
 */

// ─── Trainer-side: manage own programs ──────────────────────────────

export const createProgram = async (req, res) => {
    try {
        const trainerId = req.user.id;
        const { title, description, sessions_count, duration_weeks, price, capacity } = req.body;

        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ error: 'Title is required.' });
        }
        if (price == null || isNaN(Number(price)) || Number(price) < 0) {
            return res.status(400).json({ error: 'Price must be a non-negative number.' });
        }
        if (capacity != null && (isNaN(Number(capacity)) || Number(capacity) < 1)) {
            return res.status(400).json({ error: 'Capacity must be a positive number, or left empty for a 1:1 program.' });
        }

        const { rows } = await query(
            `INSERT INTO training_programs (trainer_id, title, description, sessions_count, duration_weeks, price, capacity)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [trainerId, title.trim(), description || null, sessions_count || null, duration_weeks || null, Number(price), capacity || null]
        );
        res.status(201).json({ program: rows[0] });
    } catch (error) {
        console.error('Error creating training program:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateProgram = async (req, res) => {
    try {
        const trainerId = req.user.id;
        const { id } = req.params;
        const { title, description, sessions_count, duration_weeks, price, capacity, status } = req.body;

        if (status && !['active', 'archived'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }
        if (price != null && (isNaN(Number(price)) || Number(price) < 0)) {
            return res.status(400).json({ error: 'Price must be a non-negative number.' });
        }
        if (capacity != null && capacity !== '' && (isNaN(Number(capacity)) || Number(capacity) < 1)) {
            return res.status(400).json({ error: 'Capacity must be a positive number, or left empty for a 1:1 program.' });
        }

        // Three distinct states for capacity: not sent (leave alone), sent as
        // '' or null (clear it — switch to a 1:1 program), sent as a number
        // (set it). Collapsing "leave alone" and "clear" onto the same SQL
        // NULL would make it impossible to ever clear a capacity.
        const capacityProvided = Object.prototype.hasOwnProperty.call(req.body, 'capacity');
        const capacityClears = capacityProvided && (capacity === '' || capacity === null);
        const capacityValue = capacityProvided && !capacityClears ? Number(capacity) : null;

        const { rows } = await query(
            `UPDATE training_programs
                SET title = COALESCE($1, title),
                    description = COALESCE($2, description),
                    sessions_count = COALESCE($3, sessions_count),
                    duration_weeks = COALESCE($4, duration_weeks),
                    price = COALESCE($5, price),
                    capacity = CASE WHEN $6 THEN NULL WHEN $7::int IS NOT NULL THEN $7::int ELSE capacity END,
                    status = COALESCE($8, status)
              WHERE id = $9 AND trainer_id = $10
          RETURNING *`,
            [title || null, description ?? null, sessions_count || null, duration_weeks || null,
             price != null ? Number(price) : null, capacityClears, capacityValue,
             status || null, id, trainerId]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Program not found or not yours.' });
        res.status(200).json({ program: rows[0] });
    } catch (error) {
        console.error('Error updating training program:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getMyPrograms = async (req, res) => {
    try {
        const trainerId = req.user.id;
        const { rows } = await query(
            `SELECT p.*,
                    COUNT(*) FILTER (WHERE e.status = 'active')::int AS active_count,
                    COUNT(*) FILTER (WHERE e.status = 'waitlisted')::int AS waitlisted_count
               FROM training_programs p
               LEFT JOIN program_enrollments e ON e.program_id = p.id
              WHERE p.trainer_id = $1
              GROUP BY p.id
              ORDER BY p.created_at DESC`,
            [trainerId]
        );
        res.status(200).json({ programs: rows });
    } catch (error) {
        console.error('Error fetching trainer programs:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/** Roster for one of the trainer's own programs — active + waitlisted, oldest first. */
export const getProgramRoster = async (req, res) => {
    try {
        const trainerId = req.user.id;
        const { id } = req.params;

        const owns = await query('SELECT id FROM training_programs WHERE id = $1 AND trainer_id = $2', [id, trainerId]);
        if (owns.rows.length === 0) return res.status(404).json({ error: 'Program not found or not yours.' });

        const { rows } = await query(
            `SELECT e.id, e.status, e.enrolled_at,
                    o.first_name AS owner_first_name, o.last_name AS owner_last_name,
                    pt.name AS pet_name, pt.species AS pet_species
               FROM program_enrollments e
               JOIN users o ON o.id = e.owner_id
               LEFT JOIN pets pt ON pt.id = e.pet_id
              WHERE e.program_id = $1 AND e.status IN ('active', 'waitlisted')
              ORDER BY e.enrolled_at ASC`,
            [id]
        );
        res.status(200).json({ roster: rows });
    } catch (error) {
        console.error('Error fetching program roster:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Public: browse a trainer's active programs ─────────────────────

export const getTrainerPrograms = async (req, res) => {
    try {
        const { trainerId } = req.params;
        const { rows } = await query(
            `SELECT p.id, p.title, p.description, p.sessions_count, p.duration_weeks, p.price, p.capacity,
                    COUNT(*) FILTER (WHERE e.status = 'active')::int AS active_count
               FROM training_programs p
               LEFT JOIN program_enrollments e ON e.program_id = p.id
              WHERE p.trainer_id = $1 AND p.status = 'active'
              GROUP BY p.id
              ORDER BY p.created_at DESC`,
            [trainerId]
        );
        const programs = rows.map(p => ({
            ...p,
            seats_left: p.capacity != null ? Math.max(0, p.capacity - p.active_count) : null,
        }));
        res.status(200).json({ programs });
    } catch (error) {
        console.error('Error fetching public trainer programs:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Owner-side: enroll, view, cancel ────────────────────────────────

/**
 * Enroll a pet in a program. Capacity is enforced with a single
 * data-modifying CTE so the count-then-insert can't race under concurrent
 * enrollments — the same pattern used by the VetAI concurrency gate.
 */
export const enrollInProgram = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const { id: programId } = req.params;
        const { pet_id } = req.body;

        const programRes = await query(`SELECT id, capacity, status FROM training_programs WHERE id = $1`, [programId]);
        if (programRes.rows.length === 0) return res.status(404).json({ error: 'Program not found.' });
        const program = programRes.rows[0];
        if (program.status !== 'active') return res.status(400).json({ error: 'This program is no longer accepting enrollments.' });

        if (pet_id) {
            const petOwns = await query('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [pet_id, ownerId]);
            if (petOwns.rows.length === 0) return res.status(400).json({ error: 'That pet was not found under your account.' });
        }

        const existing = await query(
            `SELECT id, status FROM program_enrollments WHERE program_id = $1 AND owner_id = $2 AND pet_id IS NOT DISTINCT FROM $3`,
            [programId, ownerId, pet_id || null]
        );
        if (existing.rows.length > 0 && ['active', 'waitlisted'].includes(existing.rows[0].status)) {
            return res.status(400).json({ error: 'Already enrolled in this program.', enrollment: existing.rows[0] });
        }

        // No capacity → always active. With capacity, atomically count current
        // active seats and decide active vs waitlisted in the same statement a
        // concurrent enrollment would also have to go through.
        const { rows } = await query(
            `INSERT INTO program_enrollments (program_id, owner_id, pet_id, status)
             VALUES ($1, $2, $3,
               CASE WHEN $4::int IS NULL THEN 'active'
                    WHEN (SELECT COUNT(*) FROM program_enrollments WHERE program_id = $1 AND status = 'active') < $4::int
                    THEN 'active' ELSE 'waitlisted' END)
             ON CONFLICT (program_id, owner_id, pet_id) DO UPDATE
               SET status = CASE WHEN $4::int IS NULL THEN 'active'
                                  WHEN (SELECT COUNT(*) FROM program_enrollments WHERE program_id = $1 AND status = 'active') < $4::int
                                  THEN 'active' ELSE 'waitlisted' END,
                   enrolled_at = now()
             RETURNING *`,
            [programId, ownerId, pet_id || null, program.capacity]
        );

        const enrollment = rows[0];
        res.status(201).json({
            enrollment,
            message: enrollment.status === 'waitlisted'
                ? 'This class is full — you have been added to the waitlist and will be enrolled automatically if a seat opens up.'
                : 'Enrolled successfully.',
        });
    } catch (error) {
        console.error('Error enrolling in program:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getMyEnrollments = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const { rows } = await query(
            `SELECT e.id, e.status, e.enrolled_at,
                    p.id AS program_id, p.title, p.sessions_count, p.duration_weeks, p.price,
                    t.first_name AS trainer_first_name, t.last_name AS trainer_last_name,
                    pt.name AS pet_name
               FROM program_enrollments e
               JOIN training_programs p ON p.id = e.program_id
               JOIN users t ON t.id = p.trainer_id
               LEFT JOIN pets pt ON pt.id = e.pet_id
              WHERE e.owner_id = $1 AND e.status IN ('active', 'waitlisted', 'completed')
              ORDER BY e.enrolled_at DESC`,
            [ownerId]
        );
        res.status(200).json({ enrollments: rows });
    } catch (error) {
        console.error('Error fetching enrollments:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Cancel your own enrollment. If this frees a seat in a capped program, the
 * oldest waitlisted enrollment is promoted to active in the same request —
 * a class never sits under capacity with people still waiting.
 */
export const cancelEnrollment = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const { id } = req.params;

        // RETURNING reflects the row AFTER the UPDATE, so reading `status` back
        // from it would always see 'cancelled' — never the value that decides
        // whether a seat actually opened up. The CTE reads the pre-update
        // status in the same statement, before the UPDATE overwrites it.
        const cancelled = await query(
            `WITH old AS (
               SELECT status FROM program_enrollments
                WHERE id = $1 AND owner_id = $2 AND status IN ('active', 'waitlisted')
             )
             UPDATE program_enrollments SET status = 'cancelled'
              WHERE id = $1 AND owner_id = $2 AND status IN ('active', 'waitlisted')
          RETURNING program_id, (SELECT status FROM old) AS previous_status`,
            [id, ownerId]
        );
        if (cancelled.rows.length === 0) return res.status(404).json({ error: 'Enrollment not found.' });

        const { program_id, previous_status: wasStatus } = cancelled.rows[0];
        let promoted = null;
        if (wasStatus === 'active') {
            const promote = await query(
                `UPDATE program_enrollments SET status = 'active'
                  WHERE id = (
                    SELECT id FROM program_enrollments
                     WHERE program_id = $1 AND status = 'waitlisted'
                     ORDER BY enrolled_at ASC LIMIT 1
                  )
              RETURNING id`,
                [program_id]
            );
            promoted = promote.rows[0]?.id || null;
        }

        res.status(200).json({ success: true, promoted_enrollment_id: promoted });
    } catch (error) {
        console.error('Error cancelling enrollment:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ─── Progress notes (Phase 3) ─────────────────────────────────────────

const canSeeEnrollment = async (enrollmentId, userId) => {
    const { rows } = await query(
        `SELECT e.id, e.owner_id, p.trainer_id
           FROM program_enrollments e JOIN training_programs p ON p.id = e.program_id
          WHERE e.id = $1`,
        [enrollmentId]
    );
    if (rows.length === 0) return { ok: false };
    const row = rows[0];
    return { ok: row.owner_id === userId || row.trainer_id === userId, isTrainer: row.trainer_id === userId, row };
};

export const addProgressNote = async (req, res) => {
    try {
        const { id: enrollmentId } = req.params;
        const { note } = req.body;
        if (!note || typeof note !== 'string' || !note.trim()) {
            return res.status(400).json({ error: 'Note text is required.' });
        }

        const access = await canSeeEnrollment(enrollmentId, req.user.id);
        if (!access.ok || !access.isTrainer) return res.status(403).json({ error: 'Only the trainer for this enrollment can add a note.' });

        const { rows } = await query(
            `INSERT INTO enrollment_progress_notes (enrollment_id, note) VALUES ($1, $2) RETURNING *`,
            [enrollmentId, note.trim().slice(0, 2000)]
        );
        res.status(201).json({ note: rows[0] });
    } catch (error) {
        console.error('Error adding progress note:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getProgressNotes = async (req, res) => {
    try {
        const { id: enrollmentId } = req.params;
        const access = await canSeeEnrollment(enrollmentId, req.user.id);
        if (!access.ok) return res.status(403).json({ error: 'You do not have access to this enrollment.' });

        const { rows } = await query(
            `SELECT id, note, created_at FROM enrollment_progress_notes WHERE enrollment_id = $1 ORDER BY created_at DESC`,
            [enrollmentId]
        );
        res.status(200).json({ notes: rows });
    } catch (error) {
        console.error('Error fetching progress notes:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
