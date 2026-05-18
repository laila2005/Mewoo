import express from 'express';
import { getConversations, getChatHistory, deleteMessage } from '../controllers/messageController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { query } from '../config/db.js';

const router = express.Router();

// All message routes are protected
router.use(requireAuth);

router.get('/conversations', getConversations);
router.get('/:partnerId', getChatHistory);
router.delete('/:messageId', deleteMessage);

// Send a message
router.post('/send', async (req, res) => {
    try {
        const sender_id = req.user.id;
        const { receiver_id, content } = req.body;

        if (!receiver_id || !content) {
            return res.status(400).json({ error: 'receiver_id and content are required' });
        }

        const sql = `
            INSERT INTO messages (sender_id, receiver_id, content)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const result = await query(sql, [sender_id, receiver_id, content]);

        // Create notification for receiver
        try {
            const userResult = await query('SELECT first_name, last_name FROM users WHERE id = $1', [sender_id]);
            const senderName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
            await query(
                'INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)',
                [receiver_id, 'unread_message', 'New Message', `${senderName} sent you a message`]
            );
        } catch (notifError) {
            console.error('Notification insert failed (non-critical):', notifError.message);
        }

        res.status(201).json({ message: result.rows[0] });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

export default router;
