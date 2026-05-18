import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

// Track online users globally: Map<userId, socketId>
const onlineUsers = new Map();

export const initSocketHandler = (io) => {
    // Middleware for Socket Authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: Missing token'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.email} (${socket.user.id})`);

        // Join a personal room based on user ID to receive direct messages
        socket.join(socket.user.id);
        
        // Track online status
        onlineUsers.set(socket.user.id, socket.id);
        io.emit('user_status_change', { user_id: socket.user.id, status: 'online' });

        // Provide currently online users to the newly connected user
        socket.emit('online_users', Array.from(onlineUsers.keys()));

        // Listen for outgoing messages
        socket.on('send_message', async (data) => {
            try {
                const { receiver_id, content } = data;
                const sender_id = socket.user.id;

                if (!receiver_id || !content) {
                    return socket.emit('error', 'receiver_id and content are required');
                }

                // 1. Save message to PostgreSQL
                const insertQuery = `
                    INSERT INTO messages (sender_id, receiver_id, content)
                    VALUES ($1, $2, $3)
                    RETURNING id, sender_id, receiver_id, content, is_read, created_at;
                `;
                const result = await query(insertQuery, [sender_id, receiver_id, content]);
                const savedMessage = result.rows[0];

                // 2. Emit message to the receiver's room
                io.to(receiver_id).emit('receive_message', savedMessage);
                
                // 3. Emit an acknowledgment back to the sender
                socket.emit('message_sent', savedMessage);

            } catch (error) {
                console.error('Socket message error:', error);
                socket.emit('error', 'Failed to send message');
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.email}`);
            onlineUsers.delete(socket.user.id);
            io.emit('user_status_change', { user_id: socket.user.id, status: 'offline' });
        });
    });
};
