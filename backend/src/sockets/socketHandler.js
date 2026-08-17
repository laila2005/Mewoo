import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { sendNotificationEmail } from '../services/emailService.js';

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

                // AUTO-MODERATOR: Check for inappropriate content / bad words
                const badWords = ['kosomk', 'kss', 'ahba', 'sharmouta', 'manyak', 'fuck', 'shit', 'bitch', 'asshole', 'a7a', 'khawal', 'sharmota', 'معرص', 'شرموط', 'كسمك', 'خول', 'احا'];
                const cleanContent = content.toLowerCase();
                const containsBadWord = badWords.some(word => cleanContent.includes(word));

                if (containsBadWord) {
                    console.log(`Auto-moderator: Banning user ${sender_id} via WebSockets for inappropriate messaging content: "${content}"`);
                    
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
                                ['danger', userFullName, user.role || 'owner', 'Account banned by Auto-Moderator', `Sent inappropriate message content (WebSocket): "${content}". Access revoked immediately.`]
                            );
                        }
                    }

                    socket.emit('error', 'Your message violated our community safety guidelines. Your account has been permanently banned.');
                    socket.disconnect(true);
                    return;
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

                // 4. If the recipient is OFFLINE, email them so they don't miss it.
                //    Debounced: only the first unread message in a burst triggers an email.
                if (!onlineUsers.has(String(receiver_id))) {
                    try {
                        const unread = await query(
                            'SELECT COUNT(*)::int AS c FROM messages WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false',
                            [sender_id, receiver_id]
                        );
                        if ((unread.rows[0]?.c || 0) <= 1) {
                            const info = await query(
                                `SELECT r.email AS to_email, s.first_name AS s_first, s.last_name AS s_last
                                   FROM users r, users s WHERE r.id = $1 AND s.id = $2`,
                                [receiver_id, sender_id]
                            );
                            const row = info.rows[0];
                            if (row?.to_email) {
                                const senderName = `${row.s_first || ''} ${row.s_last || ''}`.trim() || 'Someone';
                                const preview = content.length > 140 ? content.slice(0, 140) + '…' : content;
                                sendNotificationEmail(row.to_email, {
                                    subject: `New message from ${senderName} on PetPluse`,
                                    heading: `${senderName} sent you a message`,
                                    message: `"${preview}"<br/><br/>Open PetPluse to read and reply.`,
                                    ctaLabel: 'Open Messages',
                                    ctaLink: `/messages?user=${sender_id}`,
                                }).catch(() => {});
                            }
                        }
                    } catch (mailErr) {
                        console.error('Offline message email failed (non-fatal):', mailErr.message);
                    }
                }

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
