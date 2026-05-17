import { query } from '../config/db.js';

export const getPosts = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null; // May or may not be logged in

        const postsQuery = `
            SELECT p.id, p.user_id, p.content, p.image_url, p.created_at, p.likes_count,
                   u.first_name, u.last_name, u.profile_pic_url,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
                   ${userId ? `, EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as user_liked` : ''}
            FROM community_posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
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

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const insertQuery = `
            INSERT INTO community_posts (user_id, content, image_url)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const result = await query(insertQuery, [user_id, content, image_url]);
        
        // Fetch the inserted post with user details
        const post = result.rows[0];
        const userResult = await query('SELECT first_name, last_name, profile_pic_url FROM users WHERE id = $1', [user_id]);
        
        res.status(201).json({ 
            post: { 
                ...post, 
                ...userResult.rows[0], 
                comments_count: 0, 
                user_liked: false 
            } 
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
            await query(`UPDATE community_posts SET likes_count = likes_count - 1 WHERE id = $1`, [id]);
            res.status(200).json({ liked: false });
        } else {
            // Like
            await query(`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`, [id, user_id]);
            await query(`UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = $1`, [id]);
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
        const current_user_id = req.user ? req.user.id : null;
        
        const commentsQuery = `
            SELECT c.id, c.content, c.created_at, c.parent_id,
                   u.first_name, u.last_name, u.profile_pic_url,
                   (
                       SELECT json_agg(json_build_object('emoji', cr.emoji, 'count', (
                           SELECT count(*) FROM comment_reactions cr2 WHERE cr2.comment_id = c.id AND cr2.emoji = cr.emoji
                       )))
                       FROM (SELECT DISTINCT emoji FROM comment_reactions WHERE comment_id = c.id) cr
                   ) as reactions,
                   (
                       SELECT emoji FROM comment_reactions WHERE comment_id = c.id AND user_id = $2
                   ) as user_reaction
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
        `;
        const result = await query(commentsQuery, [id, current_user_id]);
        
        // Ensure reactions is an empty array if null
        const comments = result.rows.map(row => ({
            ...row,
            reactions: row.reactions || []
        }));
        
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
        
        // Fetch inserted comment with user details
        const comment = result.rows[0];
        const userResult = await query('SELECT first_name, last_name, profile_pic_url FROM users WHERE id = $1', [user_id]);
        
        res.status(201).json({ comment: { ...comment, ...userResult.rows[0], reactions: [] } });
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
