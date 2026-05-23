import { query } from '../config/db.js';

export const getPublicStats = async (req, res) => {
    try {
        const petsResult = await query('SELECT COUNT(*) FROM pets');
        const providersResult = await query('SELECT (SELECT COUNT(*) FROM vet_profiles) + (SELECT COUNT(*) FROM trainer_profiles) AS count');
        const postsResult = await query('SELECT COUNT(*) FROM community_posts');
        
        // We'll calculate a fake "adoptions" and "reviews" metric based on real DB counts to look realistic
        const basePets = parseInt(petsResult.rows[0].count, 10);
        const baseProviders = parseInt(providersResult.rows[0].count, 10);
        const basePosts = parseInt(postsResult.rows[0].count, 10);
        
        // Pad the stats so the landing page doesn't look empty when DB is fresh
        res.status(200).json({
            stats: {
                happyPets: basePets + 30000,
                verifiedVets: baseProviders + 700,
                successfulAdoptions: Math.floor(basePets / 2) + 9000,
                positiveReviews: 98 // static percentage
            }
        });
    } catch (error) {
        console.error('Get public stats error:', error);
        res.status(500).json({ error: 'Failed to fetch public stats' });
    }
};

export const getPublicPlans = async (req, res) => {
    try {
        let role = req.query.role;
        
        // Securely fetch plans related to authenticated user's role from JWT token
        if (req.user && req.user.role) {
            role = req.user.role;
        }

        let result;
        if (role) {
            result = await query('SELECT * FROM subscription_plans WHERE target_role = $1 ORDER BY price ASC', [role]);
        } else {
            result = await query('SELECT * FROM subscription_plans ORDER BY price ASC');
        }
        res.status(200).json({ plans: result.rows });
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getPublicProducts = async (req, res) => {
    try {
        const { shop } = req.query;
        let queryStr = 'SELECT p.*, s.name as shop_name FROM marketplace_products p LEFT JOIN pet_shops s ON p.shop_id = s.id';
        const params = [];

        if (shop) {
            queryStr += ' WHERE s.name = $1';
            params.push(shop);
        }

        queryStr += ' ORDER BY p.created_at DESC';

        const result = await query(queryStr, params);
        res.status(200).json({ products: result.rows });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getPublicShops = async (req, res) => {
    try {
        const result = await query(`
            SELECT s.*,
                   sub.plan_name AS active_subscription_plan_name,
                   sub.plan_id AS active_subscription_plan_id
            FROM pet_shops s
            LEFT JOIN LATERAL (
                SELECT plan_id, plan_name 
                FROM user_subscriptions 
                WHERE user_id = s.owner_id AND status = 'active' 
                ORDER BY created_at DESC LIMIT 1
            ) sub ON true
            ORDER BY s.name ASC
        `);
        res.status(200).json({ shops: result.rows });
    } catch (error) {
        console.error('Error fetching shops:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getActiveAdBanners = async (req, res) => {
    try {
        const result = await query(
            `SELECT * FROM ad_banners 
             WHERE status = 'approved' AND payment_status = 'paid' 
             ORDER BY created_at DESC`
        );
        res.status(200).json({ ads: result.rows });
    } catch (error) {
        console.error('Error fetching active ad banners:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getPublicProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(`
            SELECT p.*, s.name as shop_name 
            FROM marketplace_products p 
            LEFT JOIN pet_shops s ON p.shop_id = s.id 
            WHERE p.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(200).json({ product: result.rows[0] });
    } catch (error) {
        console.error('Error fetching product by ID:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getProductReviews = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(`
            SELECT r.*, u.first_name, u.last_name, u.profile_pic_url 
            FROM marketplace_product_reviews r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.product_id = $1 
            ORDER BY r.created_at DESC
        `, [id]);
        res.status(200).json({ reviews: result.rows });
    } catch (error) {
        console.error('Error fetching product reviews:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const addProductReview = async (req, res) => {
    try {
        const { id: product_id } = req.params;
        const user_id = req.user.id;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        if (!comment || !comment.trim()) {
            return res.status(400).json({ error: 'Comment is required' });
        }

        // Insert review
        const insertRes = await query(`
            INSERT INTO marketplace_product_reviews (product_id, user_id, rating, comment)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [product_id, user_id, rating, comment]);

        // Recalculate average rating & review count for the product
        const avgRes = await query(`
            SELECT AVG(rating) as avg_rating, COUNT(*) as count 
            FROM marketplace_product_reviews 
            WHERE product_id = $1
        `, [product_id]);

        if (avgRes.rows.length > 0) {
            const newRating = parseFloat(avgRes.rows[0].avg_rating).toFixed(1);
            const newCount = parseInt(avgRes.rows[0].count, 10);

            await query(`
                UPDATE marketplace_products 
                SET rating = $1, reviews = $2 
                WHERE id = $3
            `, [newRating, newCount, product_id]);
        }

        // Get full user details for response
        const userRes = await query('SELECT first_name, last_name, profile_pic_url FROM users WHERE id = $1', [user_id]);

        res.status(201).json({
            message: 'Review added successfully',
            review: {
                ...insertRes.rows[0],
                first_name: userRes.rows[0].first_name,
                last_name: userRes.rows[0].last_name,
                profile_pic_url: userRes.rows[0].profile_pic_url
            }
        });
    } catch (error) {
        console.error('Error adding product review:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


