import { query } from '../config/db.js';

export const getProviders = async (req, res) => {
    try {
        const vetsQuery = `
            SELECT u.id, u.first_name, u.last_name, u.latitude, u.longitude, u.profile_pic_url,
                   v.clinic_name, v.is_emergency, v.bio, v.license_number
            FROM users u
            JOIN vet_profiles v ON u.id = v.user_id
            WHERE u.role = 'vet' AND v.status = 'approved'
        `;
        
        const trainersQuery = `
            SELECT u.id, u.first_name, u.last_name, u.latitude, u.longitude, u.profile_pic_url,
                   t.specialties, t.bio
            FROM users u
            JOIN trainer_profiles t ON u.id = t.user_id
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

export const getProviderById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // First check if it's a vet
        const vetQuery = `
            SELECT u.id, u.first_name, u.last_name, u.latitude, u.longitude, u.profile_pic_url,
                   v.clinic_name, v.is_emergency, v.bio, v.license_number
            FROM users u
            JOIN vet_profiles v ON u.id = v.user_id
            WHERE u.id = $1 AND u.role = 'vet' AND v.status = 'approved'
        `;
        const vetRes = await query(vetQuery, [id]);
        
        if (vetRes.rows.length > 0) {
            return res.status(200).json({ provider: { ...vetRes.rows[0], type: 'vet' } });
        }

        // Check if it's a trainer
        const trainerQuery = `
            SELECT u.id, u.first_name, u.last_name, u.latitude, u.longitude, u.profile_pic_url,
                   t.specialties, t.bio
            FROM users u
            JOIN trainer_profiles t ON u.id = t.user_id
            WHERE u.id = $1 AND u.role = 'trainer' AND t.status = 'approved'
        `;
        const trainerRes = await query(trainerQuery, [id]);
        
        if (trainerRes.rows.length > 0) {
            return res.status(200).json({ provider: { ...trainerRes.rows[0], type: 'trainer' } });
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
