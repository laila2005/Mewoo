import { query } from '../config/db.js';
import { getCompatClient } from '../ai/llmClient.js';
import dotenv from 'dotenv';

dotenv.config();

const analyzeContentForModeration = async (content) => {
    if (!content) return { is_flagged: false, reason: null };
    
    const toxicKeywords = ['spam', 'scam', 'hack', 'toxic', 'abuse', 'buy drugs', 'inappropriate', 'violation'];
    const q = content.toLowerCase();
    
    // Check local keywords first as a fallback/mock indicator
    for (const kw of toxicKeywords) {
        if (q.includes(kw)) {
            return {
                is_flagged: true,
                reason: `Flagged by AI: Contains restricted content terms (${kw}).`
            };
        }
    }
    
    // If no live AI provider configured, return clean (keyword check above still applies)
    const ai = getCompatClient();
    if (ai.isMock) {
        return { is_flagged: false, reason: null };
    }

    try {
        const prompt = `You are an automated AI content moderator for PetPluse, a pet care community.
Analyze the following post content:
"${content}"

Check if it contains inappropriate language, severe toxicity, scam attempts, illegal/unauthorized animal trading, commercial drug selling, or malicious links.
Return a valid JSON object ONLY. Do not wrap it in markdown code blocks. The JSON must exactly match this schema:
{
  "is_flagged": true,
  "reason": "Short explanation of the violation in 1 sentence if flagged, otherwise null"
}`;

        const response = await ai.client.chat.completions.create({
            model: ai.model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content.trim());
        return {
            is_flagged: !!result.is_flagged,
            reason: result.reason || null
        };
    } catch (err) {
        console.error("AI Moderation API failure, passing through:", err.message);
        return { is_flagged: false, reason: null };
    }
};

export const getPosts = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null; // May or may not be logged in

        const postsQuery = `
            SELECT p.id, p.user_id, p.content, p.image_url, p.created_at, p.likes_count,
                   u.first_name, u.last_name, u.profile_pic_url, u.role,
                   -- Professional identity for the community badge: a vet posts as
                   -- their clinic, a vendor as their shop. Pet owners have neither
                   -- and deliberately get no badge.
                   vp.clinic_name AS author_clinic_name,
                   ps.name        AS author_shop_name,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count,
                   sub.plan_name AS active_subscription_plan_name,
                   sub.plan_id AS active_subscription_plan_id
                   ${userId ? `, EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as user_liked` : ''}
                   ${userId ? `, EXISTS(
                       SELECT 1 FROM chat_requests cr 
                       WHERE ((cr.sender_id = $1 AND cr.receiver_id = p.user_id) OR (cr.sender_id = p.user_id AND cr.receiver_id = $1))
                       AND cr.status = 'accepted'
                   ) as is_connection_post` : ', false as is_connection_post'}
            FROM community_posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN vet_profiles vp ON vp.user_id = u.id
            LEFT JOIN pet_shops    ps ON ps.owner_id = u.id
            LEFT JOIN LATERAL (
                SELECT plan_id, plan_name 
                FROM user_subscriptions 
                WHERE user_id = u.id AND status = 'active' 
                ORDER BY created_at DESC LIMIT 1
            ) sub ON true
            WHERE p.is_soft_deleted = false
            ORDER BY 
                   ${userId ? 'is_connection_post DESC,' : ''}
                   p.created_at DESC
        `;
        
        const params = userId ? [userId] : [];
        const result = await query(postsQuery, params);
        
        res.status(200).json({ posts: result.rows });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const createPost = async (req, res) => {
    try {
        const { content, image_url } = req.body;
        const user_id = req.user.id;

        if (!content && !image_url) {
            return res.status(400).json({ error: 'Post must have content or an image' });
        }

        // Run AI Auto-Moderation
        const moderation = await analyzeContentForModeration(content);
        
        let insertQuery;
        let params;
        
        if (moderation.is_flagged) {
            insertQuery = `
                INSERT INTO community_posts (user_id, content, image_url, is_soft_deleted, soft_deleted_reason, is_flagged, flagged_reason)
                VALUES ($1, $2, $3, true, $4, true, $4)
                RETURNING *;
            `;
            params = [user_id, content, image_url, moderation.reason];
            
            // Create user notification
            await query(
                `INSERT INTO notifications (user_id, type, title, message, action_url) 
                 VALUES ($1, 'system', 'Post Auto-Deleted', $2, '/explore')`,
                [
                    user_id, 
                    `Your post was soft-deleted by Auto-Moderator. Reason: ${moderation.reason}. You can request an admin manual review in your dashboard.`
                ]
            );
        } else {
            insertQuery = `
                INSERT INTO community_posts (user_id, content, image_url)
                VALUES ($1, $2, $3)
                RETURNING *;
            `;
            params = [user_id, content, image_url];
        }

        const result = await query(insertQuery, params);
        
        // Write dynamic audit log to database
        const authorName = `${req.user.first_name} ${req.user.last_name}`;
        const authorRole = req.user.role || 'owner';
        
        if (moderation.is_flagged) {
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['warning', authorName, authorRole, 'Community post flagged by Auto-Moderator', `Soft-deleted due to violation. Reason: ${moderation.reason}`]
            );
        } else {
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', authorName, authorRole, 'Published a new community post', content ? (content.substring(0, 100) + (content.length > 100 ? '...' : '')) : 'Image post']
            );
        }
        
        // Fetch the inserted post with user details
        const post = result.rows[0];
        const userResult = await query('SELECT first_name, last_name, profile_pic_url FROM users WHERE id = $1', [user_id]);
        
        if (!moderation.is_flagged) {
            // Asynchronously dispatch connection notifications in the background
            (async () => {
                try {
                    const authorName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
                    const connectionsResult = await query(
                        `SELECT u.id 
                         FROM chat_requests cr
                         JOIN users u ON (u.id = CASE WHEN cr.sender_id = $1 THEN cr.receiver_id ELSE cr.sender_id END)
                         WHERE (cr.sender_id = $1 OR cr.receiver_id = $1) 
                           AND cr.status = 'accepted' 
                           AND u.mute_connection_posts = false`,
                        [user_id]
                    );

                    const io = req.app.get('io');
                    for (const conn of connectionsResult.rows) {
                        await query(
                            `INSERT INTO notifications (user_id, type, title, message, action_url, sender_id) 
                             VALUES ($1, 'system_alert', 'New Post from Connection', $2, '/community', $3)`,
                            [conn.id, `${authorName} published a new post in the community.`, user_id]
                        );

                        if (io) {
                            io.to(String(conn.id)).emit('new_notification', {
                                type: 'system_alert',
                                title: 'New Post from Connection',
                                message: `${authorName} published a new post in the community.`,
                                action_url: '/community'
                            });
                        }
                    }
                } catch (err) {
                    console.error('Failed to dispatch connection post notifications:', err);
                }
            })();
        }

        res.status(201).json({ 
            post: { 
                ...post, 
                ...userResult.rows[0], 
                comments_count: 0, 
                user_liked: false 
            },
            moderated: moderation.is_flagged,
            moderation_reason: moderation.reason
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, image_url } = req.body;
        const user_id = req.user.id;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        // Verify ownership
        const checkQuery = `SELECT * FROM community_posts WHERE id = $1 AND user_id = $2`;
        const checkResult = await query(checkQuery, [id, user_id]);
        if (checkResult.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized to edit this post' });
        }

        const updateQuery = `
            UPDATE community_posts
            SET content = $1, image_url = $2
            WHERE id = $3 AND user_id = $4
            RETURNING *;
        `;
        const result = await query(updateQuery, [content, image_url, id, user_id]);
        
        res.status(200).json({ post: result.rows[0] });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const toggleLike = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        // Check if liked
        const checkQuery = `SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2`;
        const checkResult = await query(checkQuery, [id, user_id]);

        if (checkResult.rows.length > 0) {
            // Unlike
            await query(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, [id, user_id]);
            await query(`UPDATE community_posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1) WHERE id = $1`, [id]);
            res.status(200).json({ liked: false });
        } else {
            // Like
            await query(`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`, [id, user_id]);
            await query(`UPDATE community_posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1) WHERE id = $1`, [id]);
            res.status(200).json({ liked: true });
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getComments = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user ? req.user.id : null;
        
        const commentsQuery = `
            SELECT c.id, c.content, c.created_at, c.parent_id,
                   u.first_name, u.last_name, u.profile_pic_url, u.id as user_id, u.role,
                   vp.clinic_name AS author_clinic_name,
                   ps.name        AS author_shop_name,
                   sub.plan_name AS active_subscription_plan_name,
                   sub.plan_id AS active_subscription_plan_id,
                   (
                       SELECT json_agg(json_build_object('emoji', cr.emoji, 'user_id', cr.user_id))
                       FROM comment_reactions cr
                       WHERE cr.comment_id = c.id
                   ) as reactions
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN vet_profiles vp ON vp.user_id = u.id
            LEFT JOIN pet_shops    ps ON ps.owner_id = u.id
            LEFT JOIN LATERAL (
                SELECT plan_id, plan_name 
                FROM user_subscriptions 
                WHERE user_id = u.id AND status = 'active' 
                ORDER BY created_at DESC LIMIT 1
            ) sub ON true
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
        `;
        const result = await query(commentsQuery, [id]);
        
        const comments = result.rows.map(row => {
            const rawReactions = row.reactions || [];
            const reactionCounts = {};
            let userReaction = null;
            
            rawReactions.forEach(r => {
                reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
                if (user_id && r.user_id === user_id) {
                    userReaction = r.emoji;
                }
            });

            return {
                id: row.id,
                content: row.content,
                created_at: row.created_at,
                parent_id: row.parent_id,
                user_id: row.user_id,
                first_name: row.first_name,
                last_name: row.last_name,
                profile_pic_url: row.profile_pic_url,
                active_subscription_plan_id: row.active_subscription_plan_id,
                active_subscription_plan_name: row.active_subscription_plan_name,
                reactions: rawReactions,
                reactionCounts,
                userReaction
            };
        });
        
        res.status(200).json({ comments });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;
        const { content, parent_id } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const insertQuery = `
            INSERT INTO post_comments (post_id, user_id, content, parent_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const result = await query(insertQuery, [id, user_id, content, parent_id || null]);
        
        const comment = result.rows[0];
        const userResult = await query('SELECT first_name, last_name, profile_pic_url FROM users WHERE id = $1', [user_id]);
        
        res.status(201).json({ 
            comment: { 
                ...comment, 
                ...userResult.rows[0], 
                reactions: [],
                reactionCounts: {},
                userReaction: null
            } 
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const toggleCommentReaction = async (req, res) => {
    try {
        const { commentId } = req.params;
        const user_id = req.user.id;
        const { emoji } = req.body;

        if (!emoji) {
            return res.status(400).json({ error: 'Emoji is required' });
        }

        // Check if reaction exists
        const checkQuery = `SELECT * FROM comment_reactions WHERE comment_id = $1 AND user_id = $2`;
        const checkResult = await query(checkQuery, [commentId, user_id]);

        if (checkResult.rows.length > 0) {
            if (checkResult.rows[0].emoji === emoji) {
                // Remove reaction if clicking the same emoji
                await query(`DELETE FROM comment_reactions WHERE comment_id = $1 AND user_id = $2`, [commentId, user_id]);
                res.status(200).json({ status: 'removed' });
            } else {
                // Update to new emoji
                await query(`UPDATE comment_reactions SET emoji = $1 WHERE comment_id = $2 AND user_id = $3`, [emoji, commentId, user_id]);
                res.status(200).json({ status: 'updated' });
            }
        } else {
            // Add reaction
            await query(`INSERT INTO comment_reactions (comment_id, user_id, emoji) VALUES ($1, $2, $3)`, [commentId, user_id, emoji]);
            res.status(200).json({ status: 'added' });
        }
    } catch (error) {
        console.error('Error toggling comment reaction:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const getMyDeletedPosts = async (req, res) => {
    try {
        const user_id = req.user.id;
        const result = await query(
            `SELECT p.*, u.first_name, u.last_name, u.profile_pic_url 
             FROM community_posts p
             JOIN users u ON p.user_id = u.id
             WHERE p.user_id = $1 AND p.is_soft_deleted = true
             ORDER BY p.created_at DESC`,
            [user_id]
        );
        res.status(200).json({ posts: result.rows });
    } catch (error) {
        console.error('Error fetching user deleted posts:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const requestPostReview = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;
        
        const check = await query('SELECT * FROM community_posts WHERE id = $1 AND user_id = $2', [id, user_id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found or unauthorized' });
        }
        
        await query('UPDATE community_posts SET review_requested = true WHERE id = $1', [id]);
        res.status(200).json({ message: 'Review requested successfully. An administrator will review your post.' });
    } catch (error) {
        console.error('Error requesting review:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        const postQuery = `
            SELECT p.id, p.user_id, p.content, p.image_url, p.created_at, p.likes_count,
                   u.first_name, u.last_name, u.profile_pic_url, u.role,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count,
                   sub.plan_name AS active_subscription_plan_name,
                   sub.plan_id AS active_subscription_plan_id
                   ${userId ? `, EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as user_liked` : ''}
                   ${userId ? `, EXISTS(
                       SELECT 1 FROM chat_requests cr 
                       WHERE ((cr.sender_id = $1 AND cr.receiver_id = p.user_id) OR (cr.sender_id = p.user_id AND cr.receiver_id = $1))
                       AND cr.status = 'accepted'
                   ) as is_connection_post` : ', false as is_connection_post'}
            FROM community_posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN LATERAL (
                SELECT plan_id, plan_name 
                FROM user_subscriptions 
                WHERE user_id = u.id AND status = 'active' 
                ORDER BY created_at DESC LIMIT 1
            ) sub ON true
            WHERE p.id = ${userId ? '$2' : '$1'} AND p.is_soft_deleted = false
        `;
        
        const params = userId ? [userId, id] : [id];
        const result = await query(postQuery, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found.' });
        }
        
        res.status(200).json({ post: result.rows[0] });
    } catch (error) {
        console.error('Error fetching post by id:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

