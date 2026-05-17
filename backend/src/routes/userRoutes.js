import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { query } from '../config/db.js';

const router = express.Router();

router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            'SELECT id, first_name, last_name, profile_pic_url, bio, role, created_at FROM users WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.status(200).json({ user: result.rows[0] });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

export default router;
