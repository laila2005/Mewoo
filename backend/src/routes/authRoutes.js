import express from 'express';
import { register, login, googleLogin, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { query } from '../config/db.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);

// Protected routes
router.get('/me', requireAuth, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, email, first_name, last_name, role, profile_pic_url, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ user: result.rows[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/profile', requireAuth, updateProfile);

export default router;
