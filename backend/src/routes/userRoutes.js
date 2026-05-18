import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { query } from '../config/db.js';

const router = express.Router();

router.get('/me/subscriptions', requireAuth, async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.status(200).json({ subscriptions: result.rows });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ error: 'Failed to load subscriptions' });
    }
});

router.get('/notifications', requireAuth, async (req, res) => {
    try {
        const user_id = req.user.id;
        
        // Fetch unread chat requests
        const chatReqResult = await query(
            `SELECT cr.id, cr.sender_id, u.first_name, u.last_name, u.profile_pic_url, cr.created_at
             FROM chat_requests cr
             JOIN users u ON cr.sender_id = u.id
             WHERE cr.receiver_id = $1 AND cr.status = 'pending'
             ORDER BY cr.created_at DESC`,
            [user_id]
        );
        
        // Fetch unread messages count per sender
        const msgResult = await query(
            `SELECT m.sender_id, u.first_name, u.last_name, COUNT(m.id) as unread_count, MAX(m.created_at) as last_msg_time
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.receiver_id = $1 AND m.is_read = false
             GROUP BY m.sender_id, u.first_name, u.last_name
             ORDER BY last_msg_time DESC`,
            [user_id]
        );

        const alerts = [];
        
        chatReqResult.rows.forEach(req => {
            alerts.push({
                type: 'connection_request',
                id: req.id,
                sender_id: req.sender_id,
                title: 'New Connection Request',
                message: `${req.first_name} wants to connect with you.`,
                time: req.created_at,
                action_url: `messages.html?user=${req.sender_id}`
            });
        });

        msgResult.rows.forEach(msg => {
            alerts.push({
                type: 'unread_message',
                sender_id: msg.sender_id,
                title: 'New Message',
                message: `You have ${msg.unread_count} unread message(s) from ${msg.first_name}.`,
                time: msg.last_msg_time,
                action_url: `messages.html?user=${msg.sender_id}`
            });
        });

        // Sort combined alerts by time descending
        alerts.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        const total = alerts.length;
        
        res.status(200).json({ 
            total,
            alerts
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
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
