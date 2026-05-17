import express from 'express';
import { register, login, googleLogin, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, schemas } from '../middlewares/inputValidator.js';
import { query } from '../config/db.js';

const router = express.Router();

// Public routes — with input validation (Story 3)
router.post('/register', validateBody(schemas.register), register);
router.post('/login', validateBody(schemas.login), login);
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
        
        const postsResult = await query(
            'SELECT COUNT(*) FROM community_posts WHERE user_id = $1',
            [req.user.id]
        );
        
        const petsResult = await query(
            'SELECT COUNT(*) FROM pets WHERE owner_id = $1',
            [req.user.id]
        );
        
        const user = result.rows[0];
        user.posts_count = parseInt(postsResult.rows[0].count, 10) || 0;
        user.pets_count = parseInt(petsResult.rows[0].count, 10) || 0;
        
        res.status(200).json({ user });
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

import { uploadAvatar } from '../middlewares/uploadMiddleware.js';

router.put('/profile', requireAuth, validateBody(schemas.updateProfile), updateProfile);

// Handle avatar upload
router.post('/upload-avatar', requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a file' });
        }
        
        // Construct the URL path (relative to the public directory)
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        
        // Update user profile in DB
        const result = await query(
            'UPDATE users SET profile_pic_url = $1, updated_at = NOW() WHERE id = $2 RETURNING profile_pic_url',
            [avatarUrl, req.user.id]
        );
        
        res.status(200).json({ 
            message: 'Avatar uploaded successfully',
            profile_pic_url: result.rows[0].profile_pic_url
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Something went wrong during upload' });
    }
});

export default router;
