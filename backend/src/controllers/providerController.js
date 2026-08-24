import { query } from '../config/db.js';

export const getProviders = async (req, res) => {
    try {
        const vetsQuery = `
            SELECT u.id, u.first_name, u.last_name, u.latitude, u.longitude, u.profile_pic_url,
                   v.clinic_name, v.is_emergency, v.bio, v.license_number, v.consultation_fee,
                   sub.plan_name AS active_subscription_plan_name,
                   sub.plan_id AS active_subscription_plan_id
            FROM users u
            JOIN vet_profiles v ON u.id = v.user_id
            LEFT JOIN LATERAL (
                SELECT plan_id, plan_name 
                FROM user_subscriptions 
                WHERE user_id = u.id AND status = 'active' 
                ORDER BY created_at DESC LIMIT 1
            ) sub ON true
            WHERE u.role = 'vet' AND v.status = 'approved' AND v.is_demo IS NOT TRUE
        `;
        
        const trainersQuery = `
            SELECT u.id, u.first_name, u.last_name, u.latitude, u.longitude, u.profile_pic_url,
                   t.specialties, t.bio, t.consultation_fee,
                   sub.plan_name AS active_subscription_plan_name,
                   sub.plan_id AS active_subscription_plan_id
            FROM users u
            JOIN trainer_profiles t ON u.id = t.user_id
            LEFT JOIN LATERAL (
                SELECT plan_id, plan_name 
                FROM user_subscriptions 
                WHERE user_id = u.id AND status = 'active' 
                ORDER BY created_at DESC LIMIT 1
            ) sub ON true
            WHERE u.role = 'trainer' AND t.status = 'approved'
        `;

        const [vetsRes, trainersRes] = await Promise.all([
            query(vetsQuery),
            query(trainersQuery)
        ]);

        res.status(200).json({
            vets: vetsRes.rows,
            trainers: trainersRes.rows
        });
    } catch (error) {
        console.error('Error fetching providers:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// ── Vet's patients (pets the vet has treated) ──
export const getVetPatients = async (req, res) => {
    try {
        const vetId = req.user.id;
        const { rows } = await query(
            `SELECT p.id, p.name, p.species, p.breed, p.avatar_url, p.age_years,
                    p.gender, p.weight_kg, p.bio,
                    u.id AS owner_id, u.first_name AS owner_first, u.last_name AS owner_last,
                    u.phone AS owner_phone,
                    -- A "visit" is one that actually happened. COUNT(a.id) counted
                    -- CANCELLED and never-honoured pending bookings too, so a card
                    -- could read "2 visits" for a pet the clinic has never seen.
                    COUNT(*) FILTER (
                      WHERE a.status::text IN ('completed', 'confirmed')
                        AND a.appointment_time <= NOW()
                    )::int AS visit_count,
                    -- MAX(appointment_time) included FUTURE bookings, so a pet
                    -- booked for next week displayed that date as its LAST visit.
                    MAX(a.appointment_time) FILTER (WHERE a.appointment_time <= NOW()) AS last_visit,
                    -- The upcoming one is genuinely useful, but it is a different fact.
                    MIN(a.appointment_time) FILTER (
                      WHERE a.appointment_time > NOW()
                        AND a.status::text IN ('pending', 'confirmed')
                    ) AS next_visit
               FROM appointments a
               JOIN pets p ON p.id = a.pet_id
               JOIN users u ON u.id = p.owner_id
              WHERE a.vet_user_id = $1
              GROUP BY p.id, u.id
              ORDER BY GREATEST(
                        COALESCE(MAX(a.appointment_time) FILTER (WHERE a.appointment_time <= NOW()), '-infinity'::timestamptz),
                        COALESCE(MIN(a.appointment_time) FILTER (WHERE a.appointment_time > NOW()), '-infinity'::timestamptz)
                      ) DESC`,
            [vetId]
        );
        res.status(200).json({ patients: rows });
    } catch (error) {
        console.error('Error fetching vet patients:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// ── Full history record for one of the vet's patients ──
export const getVetPatientHistory = async (req, res) => {
    try {
        const vetId = req.user.id;
        const { petId } = req.params;

        // Authorize: the vet must have at least one appointment with this pet.
        const visitsRes = await query(
            `SELECT id, appointment_time, reason, status, created_at
               FROM appointments
              WHERE pet_id = $1 AND vet_user_id = $2
              ORDER BY appointment_time DESC`,
            [petId, vetId]
        );
        // Any NON-CANCELLED appointment establishes the clinical relationship: a
        // vet preparing for tomorrow's pending booking legitimately needs the
        // record. Previously ANY row qualified, so a booking the owner cancelled
        // still granted permanent access to the pet's entire medical history —
        // that is the case this excludes.
        //
        // Deliberately NOT limited to completed visits: checked against the real
        // data, every appointment is currently pending/cancelled or in the
        // future, so that stricter rule would have locked vets out of every
        // patient record in the product.
        const isPatient = visitsRes.rows.some(
            (v) => String(v.status) !== 'cancelled'
        );
        if (!isPatient) {
            return res.status(403).json({ error: 'This pet is not one of your patients.' });
        }

        const petRes = await query(
            `SELECT p.id, p.name, p.species, p.breed, p.age_years, p.weight_kg, p.gender, p.bio, p.avatar_url,
                    u.id AS owner_id, u.first_name AS owner_first, u.last_name AS owner_last,
                    u.email AS owner_email, u.phone AS owner_phone, u.profile_pic_url AS owner_avatar
               FROM pets p JOIN users u ON u.id = p.owner_id WHERE p.id = $1`,
            [petId]
        );
        const records = await query(
            `SELECT id, document_url, summary, created_at FROM medical_records WHERE pet_id = $1 ORDER BY created_at DESC`,
            [petId]
        );

        res.status(200).json({
            pet: petRes.rows[0] || null,
            visits: visitsRes.rows,
            records: records.rows,
        });
    } catch (error) {
        console.error('Error fetching patient history:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getProviderById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const connectionsResult = await query(
            `SELECT COUNT(*) FROM chat_requests 
             WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'accepted'`,
            [id]
        );
        const connectionsCount = parseInt(connectionsResult.rows[0].count, 10) || 0;
        
        // First check if it's a vet
        const vetQuery = `
            SELECT u.id, u.first_name, u.last_name, u.latitude, u.longitude, u.profile_pic_url,
                   v.title, v.experience, v.clinic_name, v.is_emergency, v.bio, v.license_number, v.cover_url, v.custom_sections, v.consultation_fee,
                   sub.plan_name AS active_subscription_plan_name,
                   sub.plan_id AS active_subscription_plan_id
            FROM users u
            JOIN vet_profiles v ON u.id = v.user_id
            LEFT JOIN LATERAL (
                SELECT plan_id, plan_name 
                FROM user_subscriptions 
                WHERE user_id = u.id AND status = 'active' 
                ORDER BY created_at DESC LIMIT 1
            ) sub ON true
            WHERE u.id = $1 AND u.role = 'vet' AND v.status = 'approved'
        `;
        const vetRes = await query(vetQuery, [id]);
        
        if (vetRes.rows.length > 0) {
            return res.status(200).json({ provider: { ...vetRes.rows[0], type: 'vet', connections_count: connectionsCount } });
        }

        // Check if it's a trainer
        const trainerQuery = `
            SELECT u.id, u.first_name, u.last_name, u.latitude, u.longitude, u.profile_pic_url,
                   t.title, t.experience, t.specialties, t.bio, t.cover_url, t.custom_sections, t.consultation_fee,
                   sub.plan_name AS active_subscription_plan_name,
                   sub.plan_id AS active_subscription_plan_id
            FROM users u
            JOIN trainer_profiles t ON u.id = t.user_id
            LEFT JOIN LATERAL (
                SELECT plan_id, plan_name 
                FROM user_subscriptions 
                WHERE user_id = u.id AND status = 'active' 
                ORDER BY created_at DESC LIMIT 1
            ) sub ON true
            WHERE u.id = $1 AND u.role = 'trainer' AND t.status = 'approved'
        `;
        const trainerRes = await query(trainerQuery, [id]);
        
        if (trainerRes.rows.length > 0) {
            return res.status(200).json({ provider: { ...trainerRes.rows[0], type: 'trainer', connections_count: connectionsCount } });
        }

        return res.status(404).json({ error: 'Provider not found' });
    } catch (error) {
        console.error('Error fetching provider by id:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getReviews = async (req, res) => {
    try {
        const { id } = req.params;
        const reviewsQuery = `
            SELECT r.id, r.rating, r.comment, r.created_at, 
                   u.first_name, u.last_name, u.profile_pic_url 
            FROM provider_reviews r
            JOIN users u ON r.reviewer_id = u.id
            WHERE r.provider_id = $1
            ORDER BY r.created_at DESC
        `;
        const result = await query(reviewsQuery, [id]);
        res.status(200).json({ reviews: result.rows });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const addReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const reviewer_id = req.user.id;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        const providerCheck = await query(`SELECT role FROM users WHERE id = $1`, [id]);
        if (providerCheck.rows.length === 0 || !['vet', 'trainer'].includes(providerCheck.rows[0].role)) {
            return res.status(404).json({ error: 'Provider not found' });
        }

        const insertQuery = `
            INSERT INTO provider_reviews (provider_id, reviewer_id, rating, comment)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await query(insertQuery, [id, reviewer_id, rating, comment]);

        res.status(201).json({ review: result.rows[0], message: 'Review added successfully' });
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
