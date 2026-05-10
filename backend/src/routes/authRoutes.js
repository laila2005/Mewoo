import express from 'express';
import { register, login, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, schemas } from '../middlewares/inputValidator.js';
import { query } from '../config/db.js';

const router = express.Router();

// Public routes — with input validation (Story 3)
router.post('/register', validateBody(schemas.register), register);
router.post('/login', validateBody(schemas.login), login);

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
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

// Admin: Get all users
router.get('/users', requireAuth, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, email, first_name, last_name, role, profile_pic_url, created_at FROM users ORDER BY created_at DESC'
        );
        res.status(200).json({ users: result.rows });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

router.put('/profile', requireAuth, validateBody(schemas.updateProfile), updateProfile);

export default router;
