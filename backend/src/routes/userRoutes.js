import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { query } from '../config/db.js';

const router = express.Router();

router.get('/notifications', requireAuth, async (req, res) => {
    try {
        const user_id = req.user.id;
        
        // Count unread chat requests
        const chatReqResult = await query(
            "SELECT COUNT(*) FROM chat_requests WHERE receiver_id = $1 AND status = 'pending'",
            [user_id]
        );
        
        // Count unread messages
        const msgResult = await query(
            "SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = false",
            [user_id]
        );

        // Count system notifications
        const sysResult = await query(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false",
            [user_id]
        );
        
        const pending_requests = parseInt(chatReqResult.rows[0].count);
        const unread_messages = parseInt(msgResult.rows[0].count);
        const unread_alerts = parseInt(sysResult.rows[0].count);
        const total = pending_requests + unread_messages + unread_alerts;
        
        res.status(200).json({ 
            total,
            details: { pending_requests, unread_messages, unread_alerts }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

router.get('/notifications/alerts', requireAuth, async (req, res) => {
    try {
        const user_id = req.user.id;
        const result = await query(
            "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
            [user_id]
        );
        // Mark as read
        await query(
            "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
            [user_id]
        );
        res.status(200).json({ alerts: result.rows });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

router.get('/search/all', requireAuth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(200).json({ users: [] });
        }
        
        const result = await query(
            "SELECT id, first_name, last_name, profile_pic_url, role FROM users WHERE (first_name ILIKE $1 OR last_name ILIKE $1) AND id != $2 LIMIT 10",
            [`%${q.trim()}%`, req.user.id]
        );
        res.status(200).json({ users: result.rows });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

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
