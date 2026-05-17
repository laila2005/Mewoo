import { query } from '../config/db.js';

// Send a chat request to a pet owner
export const sendChatRequest = async (req, res) => {
    try {
        const sender_id = req.user.id;
        const { receiver_id, pet_id } = req.body;

        if (!receiver_id || !pet_id) {
            return res.status(400).json({ error: 'Receiver ID and Pet ID are required' });
        }

        if (sender_id === receiver_id) {
            return res.status(400).json({ error: 'Cannot send a chat request to yourself' });
        }

        // Check if request already exists
        const checkQuery = 'SELECT * FROM chat_requests WHERE sender_id = $1 AND receiver_id = $2 AND pet_id = $3';
        const checkResult = await query(checkQuery, [sender_id, receiver_id, pet_id]);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({ error: 'Chat request already sent', request: checkResult.rows[0] });
        }

        const insertQuery = `
            INSERT INTO chat_requests (sender_id, receiver_id, pet_id, status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING *;
        `;
        const result = await query(insertQuery, [sender_id, receiver_id, pet_id]);

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

        if (!receiver_id || !pet_id) {
            return res.status(400).json({ error: 'Receiver ID and Pet ID are required' });
        }

        const sql = 'SELECT * FROM chat_requests WHERE sender_id = $1 AND receiver_id = $2 AND pet_id = $3 LIMIT 1';
        const result = await query(sql, [sender_id, receiver_id, pet_id]);

        if (result.rows.length === 0) {
            return res.status(200).json({ status: 'none' });
        }

        res.status(200).json({ status: result.rows[0].status, request: result.rows[0] });
    } catch (error) {
        console.error('Error checking chat status:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
