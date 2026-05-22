import { query } from '../config/db.js';

// Send a chat request to a user
export const sendChatRequest = async (req, res) => {
    try {
        const sender_id = req.user.id;
        const { receiver_id, pet_id } = req.body; // pet_id is optional now

        if (!receiver_id) {
            return res.status(400).json({ error: 'Receiver ID is required' });
        }

        if (sender_id === receiver_id) {
            return res.status(400).json({ error: 'Cannot send a chat request to yourself' });
        }

        // Fetch roles of both users to prevent vendor connections
        const rolesCheck = await query('SELECT id, role FROM users WHERE id IN ($1, $2)', [sender_id, receiver_id]);
        const containsVendor = rolesCheck.rows.some(u => u.role === 'vendor');
        if (containsVendor) {
            return res.status(400).json({ error: 'Business shop profiles cannot connect or be connected to' });
        }

        // Check if request already exists
        let checkQuery = 'SELECT * FROM chat_requests WHERE sender_id = $1 AND receiver_id = $2';
        let queryParams = [sender_id, receiver_id];
        
        if (pet_id) {
            checkQuery += ' AND pet_id = $3';
            queryParams.push(pet_id);
        } else {
            checkQuery += ' AND pet_id IS NULL';
        }

        const checkResult = await query(checkQuery, queryParams);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({ error: 'Chat request already sent', request: checkResult.rows[0] });
        }

        const insertQuery = `
            INSERT INTO chat_requests (sender_id, receiver_id, pet_id, status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING *;
        `;
        const result = await query(insertQuery, [sender_id, receiver_id, pet_id || null]);

        // Get sender name to make the notification look great
        const senderResult = await query('SELECT first_name, last_name, profile_pic_url FROM users WHERE id = $1', [sender_id]);
        const sender = senderResult.rows[0];
        const senderName = sender ? `${sender.first_name} ${sender.last_name}` : 'Someone';

        // Emit over Socket.IO in real-time
        const io = req.app.get('io');
        if (io) {
            io.to(String(receiver_id)).emit('chat_request_received', {
                request: result.rows[0],
                sender_id,
                sender_name: senderName,
                sender_avatar: sender?.profile_pic_url,
                message: `${senderName} wants to connect with you.`
            });

            io.to(String(receiver_id)).emit('new_notification', {
                type: 'connection_request',
                title: 'New Connection Request',
                message: `${senderName} wants to connect with you.`,
                action_url: `/messages?user=${sender_id}`
            });
        }

        res.status(201).json({ message: 'Chat request sent successfully', request: result.rows[0] });
    } catch (error) {
        console.error('Error sending chat request:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

// Check chat request status
export const checkChatStatus = async (req, res) => {
    try {
        const sender_id = req.user.id;
        const { receiver_id, pet_id } = req.query;

        if (!receiver_id) {
            return res.status(400).json({ error: 'Receiver ID is required' });
        }

        // Query spam status
        const spamCheck = await query(
            'SELECT 1 FROM spam_reports WHERE reporter_id = $1 AND reported_id = $2',
            [sender_id, receiver_id]
        );
        const isSpam = spamCheck.rows.length > 0;

        let sql = 'SELECT * FROM chat_requests WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))';
        let queryParams = [sender_id, receiver_id];

        if (pet_id) {
            sql += ' AND pet_id = $3';
            queryParams.push(pet_id);
        }
        // No pet_id filter when not provided — check ANY request between these two users
        
        sql += ' ORDER BY created_at DESC LIMIT 1';

        const result = await query(sql, queryParams);

        if (result.rows.length === 0) {
            return res.status(200).json({ status: 'none', is_spam: isSpam });
        }

        res.status(200).json({ status: result.rows[0].status, request: result.rows[0], is_spam: isSpam });
    } catch (error) {
        console.error('Error checking chat status:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getChatRequests = async (req, res) => {
    try {
        const user_id = req.user.id;
        // Fetch incoming pending requests
        const sql = `
            SELECT cr.*, u.first_name, u.last_name, u.profile_pic_url, p.name as pet_name 
            FROM chat_requests cr
            JOIN users u ON cr.sender_id = u.id
            LEFT JOIN pets p ON cr.pet_id = p.id
            WHERE cr.receiver_id = $1 AND cr.status = 'pending'
            ORDER BY cr.created_at DESC
        `;
        const result = await query(sql, [user_id]);
        res.status(200).json({ requests: result.rows });
    } catch (error) {
        console.error('Error fetching chat requests:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const acceptChatRequest = async (req, res) => {
    try {
        const user_id = req.user.id;
        const request_id = req.params.id;

        const checkQuery = 'SELECT * FROM chat_requests WHERE id = $1 AND receiver_id = $2';
        const checkResult = await query(checkQuery, [request_id, user_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found or not authorized' });
        }

        const updateQuery = 'UPDATE chat_requests SET status = $1 WHERE id = $2 RETURNING *';
        const result = await query(updateQuery, ['accepted', request_id]);

        // Notify the sender that their request was accepted
        const sender_id = result.rows[0].sender_id;
        const userQuery = 'SELECT first_name, last_name FROM users WHERE id = $1';
        const userResult = await query(userQuery, [user_id]);
        const receiver_name = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;

        await query(
            'INSERT INTO notifications (user_id, type, title, message, sender_id, action_url) VALUES ($1, $2, $3, $4, $5, $6)',
            [sender_id, 'system_alert', 'Request Accepted', `${receiver_name} accepted your request. You can now start messaging!`, user_id, `/messages?user=${user_id}`]
        );

        // Notify the sender over Socket.IO in real-time
        const io = req.app.get('io');
        if (io) {
            io.to(String(sender_id)).emit('chat_request_accepted', {
                request_id: result.rows[0].id,
                receiver_id: user_id,
                receiver_name: receiver_name,
                message: `${receiver_name} accepted your chat request. Start messaging now!`
            });

            io.to(String(sender_id)).emit('new_notification', {
                type: 'system_alert',
                title: 'Request Accepted',
                message: `${receiver_name} accepted your request. You can now start messaging!`,
                action_url: `/messages?user=${user_id}`
            });
        }

        res.status(200).json({ message: 'Request accepted', request: result.rows[0] });
    } catch (error) {
        console.error('Error accepting chat request:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const ignoreChatRequest = async (req, res) => {
    try {
        const user_id = req.user.id;
        const request_id = req.params.id;

        const checkQuery = 'SELECT * FROM chat_requests WHERE id = $1 AND receiver_id = $2';
        const checkResult = await query(checkQuery, [request_id, user_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found or not authorized' });
        }

        const updateQuery = 'UPDATE chat_requests SET status = $1 WHERE id = $2 RETURNING *';
        const result = await query(updateQuery, ['rejected', request_id]);

        res.status(200).json({ message: 'Request ignored', request: result.rows[0] });
    } catch (error) {
        console.error('Error ignoring chat request:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const reportSpam = async (req, res) => {
    try {
        const reporter_id = req.user.id;
        const { target_user_id } = req.body;

        if (!target_user_id) {
            return res.status(400).json({ error: 'Target user ID is required' });
        }

        // Insert into spam_reports
        await query(
            `INSERT INTO spam_reports (reporter_id, reported_id) 
             VALUES ($1, $2) 
             ON CONFLICT (reporter_id, reported_id) DO NOTHING`,
            [reporter_id, target_user_id]
        );

        // Reject any pending chat request between these two users
        await query(
            `UPDATE chat_requests 
             SET status = 'rejected' 
             WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) AND status = 'pending'`,
            [reporter_id, target_user_id]
        );

        res.status(200).json({ message: 'User reported as spam successfully' });
    } catch (error) {
        console.error('Error reporting spam:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const removeSpam = async (req, res) => {
    try {
        const reporter_id = req.user.id;
        const { target_user_id } = req.body;

        if (!target_user_id) {
            return res.status(400).json({ error: 'Target user ID is required' });
        }

        await query(
            'DELETE FROM spam_reports WHERE reporter_id = $1 AND reported_id = $2',
            [reporter_id, target_user_id]
        );

        res.status(200).json({ message: 'User removed from spam successfully' });
    } catch (error) {
        console.error('Error removing spam:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getConnections = async (req, res) => {
    try {
        const userId = req.user.id;

        const sql = `
            SELECT 
                u.id, u.first_name, u.last_name, u.profile_pic_url, u.role
            FROM chat_requests cr
            JOIN users u ON (u.id = CASE WHEN cr.sender_id = $1 THEN cr.receiver_id ELSE cr.sender_id END)
            WHERE (cr.sender_id = $1 OR cr.receiver_id = $1) AND cr.status = 'accepted'
            ORDER BY u.first_name ASC, u.last_name ASC;
        `;

        const result = await query(sql, [userId]);
        res.status(200).json({ connections: result.rows });
    } catch (error) {
        console.error('Error fetching user connections:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

