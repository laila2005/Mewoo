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

        let sql = 'SELECT * FROM chat_requests WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))';
        let queryParams = [sender_id, receiver_id];

        if (pet_id) {
            sql += ' AND pet_id = $3';
            queryParams.push(pet_id);
        } else {
            sql += ' AND pet_id IS NULL';
        }
        
        sql += ' ORDER BY created_at DESC LIMIT 1';

        const result = await query(sql, queryParams);

        if (result.rows.length === 0) {
            return res.status(200).json({ status: 'none' });
        }

        res.status(200).json({ status: result.rows[0].status, request: result.rows[0] });
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
            SELECT cr.*, u.first_name, u.last_name, u.profile_pic_url, u.avatar_url 
            FROM chat_requests cr
            JOIN users u ON cr.sender_id = u.id
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

        res.status(200).json({ message: 'Request accepted', request: result.rows[0] });
    } catch (error) {
        console.error('Error accepting chat request:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
