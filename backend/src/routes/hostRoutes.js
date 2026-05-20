import express from 'express';
import { db } from '../config/db.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get all available hosts
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT h.*, u.first_name, u.last_name, u.profile_pic_url as avatar, u.email,
                   (SELECT COALESCE(AVG(rating), 0) FROM host_reviews hr WHERE hr.host_id = h.user_id) as average_rating,
                   (SELECT COUNT(*) FROM host_reviews hr WHERE hr.host_id = h.user_id) as review_count
            FROM host_profiles h
            JOIN users u ON h.user_id = u.id
            WHERE h.is_available = true
            ORDER BY h.created_at DESC
        `;
        const result = await db.query(query);
        res.json({ hosts: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch hosts' });
    }
});

// Get current user's host profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM host_profiles WHERE user_id = $1', [req.user.id]);
        res.json({ profile: result.rows[0] || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch host profile' });
    }
});

// Create or update host profile
router.post('/profile', authMiddleware, async (req, res) => {
    try {
        const { is_available, hourly_rate, daily_rate, bio, max_pets, accepted_pets } = req.body;
        
        // Validation (Pricing: minimum 50, maximum 5000)
        if (hourly_rate !== null && hourly_rate !== undefined) {
            if (hourly_rate < 50 || hourly_rate > 5000) {
                return res.status(400).json({ error: 'Hourly rate must be between 50 and 5000 EGP' });
            }
        }
        if (daily_rate !== null && daily_rate !== undefined) {
            if (daily_rate < 50 || daily_rate > 5000) {
                return res.status(400).json({ error: 'Daily rate must be between 50 and 5000 EGP' });
            }
        }

        const query = `
            INSERT INTO host_profiles (user_id, is_available, hourly_rate, daily_rate, bio, max_pets, accepted_pets, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET
                is_available = EXCLUDED.is_available,
                hourly_rate = EXCLUDED.hourly_rate,
                daily_rate = EXCLUDED.daily_rate,
                bio = EXCLUDED.bio,
                max_pets = EXCLUDED.max_pets,
                accepted_pets = EXCLUDED.accepted_pets,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `;
        const values = [req.user.id, is_available || false, hourly_rate || null, daily_rate || null, bio || '', max_pets || 1, accepted_pets || ['Dog', 'Cat']];
        const result = await db.query(query, values);
        res.json({ profile: result.rows[0], message: 'Host profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update host profile' });
    }
});

// Book a host
router.post('/:hostId/book', authMiddleware, async (req, res) => {
    try {
        const { hostId } = req.params;
        const { pet_id, start_date, end_date, total_price } = req.body;
        
        if (hostId === req.user.id) {
            return res.status(400).json({ error: 'You cannot book yourself' });
        }

        const query = `
            INSERT INTO host_bookings (host_id, pet_owner_id, pet_id, start_date, end_date, total_price)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const result = await db.query(query, [hostId, req.user.id, pet_id, start_date, end_date, total_price]);
        res.status(201).json({ booking: result.rows[0], message: 'Booking request sent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send booking request' });
    }
});

// Get incoming requests
router.get('/bookings/incoming', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT hb.*, p.name as pet_name, p.avatar_url as pet_avatar, p.breed as pet_breed, p.species as pet_species,
                   u.first_name as owner_first_name, u.last_name as owner_last_name, u.profile_pic_url as owner_avatar
            FROM host_bookings hb
            JOIN pets p ON hb.pet_id = p.id
            JOIN users u ON hb.pet_owner_id = u.id
            WHERE hb.host_id = $1
            ORDER BY hb.created_at DESC
        `;
        const result = await db.query(query, [req.user.id]);
        res.json({ bookings: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch incoming requests' });
    }
});

// Get outgoing requests
router.get('/bookings/outgoing', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT hb.*, p.name as pet_name, p.avatar_url as pet_avatar,
                   u.first_name as host_first_name, u.last_name as host_last_name, u.profile_pic_url as host_avatar
            FROM host_bookings hb
            JOIN pets p ON hb.pet_id = p.id
            JOIN users u ON hb.host_id = u.id
            WHERE hb.pet_owner_id = $1
            ORDER BY hb.created_at DESC
        `;
        const result = await db.query(query, [req.user.id]);
        res.json({ bookings: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch outgoing requests' });
    }
});

// Update booking status
router.put('/bookings/:id/status', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected' or 'completed'
        
        // Ensure user is the host for this booking
        const check = await db.query('SELECT host_id FROM host_bookings WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
        if (check.rows[0].host_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

        const query = `UPDATE host_bookings SET status = $1 WHERE id = $2 RETURNING *`;
        const result = await db.query(query, [status, id]);
        res.json({ booking: result.rows[0], message: `Booking ${status} successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update booking status' });
    }
});

// Add Review
router.post('/:hostId/reviews', authMiddleware, async (req, res) => {
    try {
        const { hostId } = req.params;
        const { rating, comment } = req.body;
        
        // Optional: Check if a completed booking exists
        const checkBooking = await db.query('SELECT id FROM host_bookings WHERE host_id = $1 AND pet_owner_id = $2 AND status = $3 LIMIT 1', [hostId, req.user.id, 'completed']);
        // If we want to strictly enforce it:
        // if (checkBooking.rows.length === 0) return res.status(400).json({ error: 'You must have a completed booking to leave a review.' });
        
        const query = `
            INSERT INTO host_reviews (host_id, reviewer_id, rating, comment)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const result = await db.query(query, [hostId, req.user.id, rating, comment]);
        res.status(201).json({ review: result.rows[0], message: 'Review added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add review' });
    }
});

// Get Reviews
router.get('/:hostId/reviews', async (req, res) => {
    try {
        const { hostId } = req.params;
        const query = `
            SELECT hr.*, u.first_name, u.last_name, u.profile_pic_url as avatar
            FROM host_reviews hr
            JOIN users u ON hr.reviewer_id = u.id
            WHERE hr.host_id = $1
            ORDER BY hr.created_at DESC
        `;
        const result = await db.query(query, [hostId]);
        res.json({ reviews: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

export default router;
