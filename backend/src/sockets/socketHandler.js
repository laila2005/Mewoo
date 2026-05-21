import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

// Track online users globally: Map<userId, socketId>
const onlineUsers = new Map();

// Export helper to query active socket online users
export const getSocketOnlineUsers = () => {
    return Array.from(onlineUsers.keys());
};

// Helper to update database last_seen
const updateLastSeen = async (userId) => {
    try {
        await query('UPDATE users SET last_seen = NOW() WHERE id = $1', [userId]);
    } catch (dbErr) {
        console.error('Failed to update last_seen:', dbErr.message);
    }
};

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
        updateLastSeen(socket.user.id);

        // Join a personal room based on user ID to receive direct messages
        socket.join(String(socket.user.id));
        
        // Track online status using a Set of socket IDs for each user
        const userIdStr = String(socket.user.id);
        if (!onlineUsers.has(userIdStr)) {
            onlineUsers.set(userIdStr, new Set());
            io.emit('user_status_change', { user_id: socket.user.id, status: 'online' });
        }
        onlineUsers.get(userIdStr).add(socket.id);

        // Provide currently online users to the newly connected user
        socket.emit('online_users', Array.from(onlineUsers.keys()));

        // Listen for outgoing messages
        socket.on('send_message', async (data) => {
            updateLastSeen(socket.user.id);
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

                // 2. Emit message to both receiver and sender rooms
                io.to(String(receiver_id)).emit('receive_message', savedMessage);
                io.to(String(sender_id)).emit('receive_message', savedMessage);
                
                // 3. Emit an acknowledgment back to the sender
                socket.emit('message_sent', savedMessage);

            } catch (error) {
                console.error('Socket message error:', error);
                socket.emit('error', 'Failed to send message');
            }
        });

        socket.on('typing', ({ receiver_id }) => {
            updateLastSeen(socket.user.id);
            io.to(String(receiver_id)).emit('user_typing', { user_id: socket.user.id });
        });

        socket.on('stop_typing', ({ receiver_id }) => {
            io.to(String(receiver_id)).emit('user_stop_typing', { user_id: socket.user.id });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.email}`);
            const userIdStr = String(socket.user.id);
            const sockets = onlineUsers.get(userIdStr);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineUsers.delete(userIdStr);
                    io.emit('user_status_change', { user_id: socket.user.id, status: 'offline' });
                }
            }
        });
    });
};
