import { query } from '../config/db.js';

// Get list of active conversations (inbox view)
export const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // This query finds the latest message for every distinct conversation partner
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
                u.role
            FROM RankedMessages r
            JOIN users u ON u.id = r.partner_id
            WHERE r.rn = 1
            ORDER BY r.created_at DESC;
        `;
        
        const result = await query(sql, [userId]);
        
        // Also fetch pending chat requests
        const requestsSql = `
            SELECT 
                cr.id, cr.status, cr.created_at, cr.sender_id,
                u.first_name, u.last_name, u.profile_pic_url, u.role
            FROM chat_requests cr
            JOIN users u ON u.id = cr.sender_id
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

        if (!partnerId) {
            return res.status(400).json({ error: 'Partner ID is required' });
        }

        const sql = `
            SELECT * FROM messages
            WHERE (sender_id = $1 AND receiver_id = $2)
               OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at ASC;
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
