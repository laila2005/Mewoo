import { query } from '../config/db.js';

// Get list of active conversations (inbox view)
export const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Update user presence
        await query('UPDATE users SET last_seen = NOW() WHERE id = $1', [userId]);

        const sql = `
            WITH RankedMessages AS (
                SELECT 
                    m.*,
                    CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS partner_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END 
                        ORDER BY created_at DESC
                    ) as rn
                FROM messages m
                WHERE sender_id = $1 OR receiver_id = $1
            )
            SELECT 
                r.id as message_id,
                r.content as last_message,
                r.created_at as last_message_time,
                r.is_read,
                r.sender_id,
                u.id as partner_id,
                u.first_name,
                u.last_name,
                u.profile_pic_url,
                u.role,
                sub.plan_name AS active_subscription_plan_name,
                sub.plan_id AS active_subscription_plan_id,
                EXISTS(
                    SELECT 1 FROM spam_reports sr 
                    WHERE sr.reporter_id = $1 AND sr.reported_id = u.id
                ) as is_spam
            FROM RankedMessages r
            JOIN users u ON u.id = r.partner_id
            LEFT JOIN LATERAL (
                SELECT plan_id, plan_name 
                FROM user_subscriptions 
                WHERE user_id = u.id AND status = 'active' 
                ORDER BY created_at DESC LIMIT 1
            ) sub ON true
            WHERE r.rn = 1
            ORDER BY r.created_at DESC;
        `;
        
        const result = await query(sql, [userId]);
        
        // Also fetch pending chat requests
        const requestsSql = `
            SELECT 
                cr.id, cr.status, cr.created_at, cr.sender_id,
                u.first_name, u.last_name, u.profile_pic_url, u.role,
                sub.plan_name AS active_subscription_plan_name,
                sub.plan_id AS active_subscription_plan_id
            FROM chat_requests cr
            JOIN users u ON u.id = cr.sender_id
            LEFT JOIN LATERAL (
                SELECT plan_id, plan_name 
                FROM user_subscriptions 
                WHERE user_id = u.id AND status = 'active' 
                ORDER BY created_at DESC LIMIT 1
            ) sub ON true
            WHERE cr.receiver_id = $1 AND cr.status = 'pending'
            ORDER BY cr.created_at DESC;
        `;
        const requestsResult = await query(requestsSql, [userId]);

        res.status(200).json({ 
            conversations: result.rows,
            pending_requests: requestsResult.rows 
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// Get chat history with a specific user
export const getChatHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { partnerId } = req.params;

        // Update user presence
        await query('UPDATE users SET last_seen = NOW() WHERE id = $1', [userId]);

        if (!partnerId) {
            return res.status(400).json({ error: 'Partner ID is required' });
        }

        const sql = `
            SELECT m.*, 
                   COALESCE(
                       JSON_AGG(
                           JSON_BUILD_OBJECT('user_id', mr.user_id, 'emoji', mr.emoji)
                       ) FILTER (WHERE mr.message_id IS NOT NULL), 
                       '[]'::json
                   ) AS reactions
            FROM messages m
            LEFT JOIN message_reactions mr ON m.id = mr.message_id
            WHERE (m.sender_id = $1 AND m.receiver_id = $2)
               OR (m.sender_id = $2 AND m.receiver_id = $1)
            GROUP BY m.id
            ORDER BY m.created_at ASC;
        `;
        
        const result = await query(sql, [userId, partnerId]);

        // Mark messages as read if the current user is the receiver
        if (result.rows.length > 0) {
            const unreadIds = result.rows
                .filter(m => m.receiver_id === userId && !m.is_read)
                .map(m => m.id);
                
            if (unreadIds.length > 0) {
                await query(`UPDATE messages SET is_read = TRUE WHERE id = ANY($1)`, [unreadIds]);
            }
        }

        res.status(200).json({ messages: result.rows });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// Delete a message (only sender can delete their own message)
export const deleteMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;

        const result = await query(
            'DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING id',
            [messageId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized or message not found' });
        }

        res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// Add or toggle a message reaction
export const toggleReaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;
        const { emoji } = req.body;

        // Update user presence
        await query('UPDATE users SET last_seen = NOW() WHERE id = $1', [userId]);

        if (!emoji) {
            return res.status(400).json({ error: 'Emoji is required' });
        }

        // 1. Verify message exists and user is part of the chat
        const msgResult = await query(
            'SELECT id, sender_id, receiver_id FROM messages WHERE id = $1',
            [messageId]
        );

        if (msgResult.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        const msg = msgResult.rows[0];
        if (msg.sender_id !== userId && msg.receiver_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized to react to this message' });
        }

        // 2. Check if reaction exists
        const existingResult = await query(
            'SELECT emoji FROM message_reactions WHERE message_id = $1 AND user_id = $2',
            [messageId, userId]
        );

        if (existingResult.rows.length > 0) {
            if (existingResult.rows[0].emoji === emoji) {
                // Same emoji clicked: delete the reaction (toggle off)
                await query(
                    'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2',
                    [messageId, userId]
                );
            } else {
                // Different emoji clicked: update the reaction
                await query(
                    'UPDATE message_reactions SET emoji = $1 WHERE message_id = $2 AND user_id = $3',
                    [emoji, messageId, userId]
                );
            }
        } else {
            // New reaction
            await query(
                'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)',
                [messageId, userId, emoji]
            );
        }

        // 3. Fetch all updated reactions for this message
        const updatedResult = await query(
            'SELECT user_id, emoji FROM message_reactions WHERE message_id = $1',
            [messageId]
        );
        const reactions = updatedResult.rows;

        // 4. Emit socket event to the chat partner
        try {
            const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
            const io = req.app.get('io');
            if (io) {
                io.to(String(partnerId)).emit('message_reaction', { message_id: messageId, reactions });
            }
        } catch (socketError) {
            console.error('Failed to emit reaction socket event (non-critical):', socketError);
        }

        res.status(200).json({ message_id: messageId, reactions });
    } catch (error) {
        console.error('Error toggling reaction:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
