import express from 'express';
import { getConversations, getChatHistory, deleteMessage, toggleReaction } from '../controllers/messageController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { query } from '../config/db.js';

const router = express.Router();

// All message routes are protected
router.use(requireAuth);

router.get('/conversations', getConversations);
router.get('/:partnerId', getChatHistory);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/react', toggleReaction);

// Send a message
router.post('/send', async (req, res) => {
    try {
        const sender_id = req.user.id;
        const { receiver_id, content } = req.body;

        // Update user presence
        await query('UPDATE users SET last_seen = NOW() WHERE id = $1', [sender_id]);

        if (!receiver_id || !content) {
            return res.status(400).json({ error: 'receiver_id and content are required' });
        }

        // AUTO-MODERATOR: Check for inappropriate content / bad words
        const badWords = ['kosomk', 'kss', 'ahba', 'sharmouta', 'manyak', 'fuck', 'shit', 'bitch', 'asshole', 'a7a', 'khawal', 'sharmota', 'معرص', 'شرموط', 'كسمك', 'خول', 'احا'];
        const cleanContent = content.toLowerCase();
        const containsBadWord = badWords.some(word => cleanContent.includes(word));

        if (containsBadWord) {
            console.log(`Auto-moderator: Banning user ${sender_id} via REST API for inappropriate messaging content: "${content}"`);
            
            const userRes = await query('SELECT password_hash, first_name, last_name, role FROM users WHERE id = $1', [sender_id]);
            if (userRes.rows.length > 0) {
                const user = userRes.rows[0];
                if (user.role !== 'admin') {
                    let hash = user.password_hash;
                    if (!hash.startsWith('BANNED:')) {
                        hash = 'BANNED:' + hash;
                        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, sender_id]);
                    }

                    // Write real audit log to DB
                    const userFullName = `${user.first_name} ${user.last_name}`;
                    await query(
                        `INSERT INTO audit_logs (level, user_name, role, action, details) 
                         VALUES ($1, $2, $3, $4, $5)`,
                        ['danger', userFullName, user.role || 'owner', 'Account banned by Auto-Moderator', `Sent inappropriate message content (REST API): "${content}". Access revoked immediately.`]
                    );
                }
            }

            return res.status(403).json({ error: 'Your message violated our community safety guidelines. Your account has been permanently banned.' });
        }

        const sql = `
            INSERT INTO messages (sender_id, receiver_id, content)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const result = await query(sql, [sender_id, receiver_id, content]);
        const savedMessage = result.rows[0];

        // Create notification for receiver
        try {
            const userResult = await query('SELECT first_name, last_name FROM users WHERE id = $1', [sender_id]);
            const senderName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
            await query(
                'INSERT INTO notifications (user_id, type, title, message, sender_id, action_url) VALUES ($1, $2, $3, $4, $5, $6)',
                [receiver_id, 'unread_message', 'New Message', `${senderName} sent you a message`, sender_id, `/messages?user=${sender_id}`]
            );

            // Emit to recipient and sender via Socket.IO
            const io = req.app.get('io');
            if (io) {
                io.to(String(receiver_id)).emit('receive_message', savedMessage);
                io.to(String(sender_id)).emit('receive_message', savedMessage);
            }
        } catch (notifError) {
            console.error('Notification/Socket emit failed (non-critical):', notifError.message);
        }

        res.status(201).json({ message: savedMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

export default router;
