import { query } from '../config/db.js';
import crypto from 'crypto';

export const getShopDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query('SELECT * FROM pet_shops WHERE owner_id = $1 LIMIT 1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        res.status(200).json({ shop: result.rows[0] });
    } catch (error) {
        console.error('Error fetching shop:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateShopDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, category, address, image, tax_id } = req.body;
        
        let result = await query(
            `UPDATE pet_shops 
             SET name = $1, category = $2, address = $3, image = $4, tax_id = $5 
             WHERE owner_id = $6 RETURNING *`,
            [name, category, address, image, tax_id, userId]
        );
        
        if (result.rows.length === 0) {
            // Upsert: Create a new shop row if it doesn't exist for this user
            result = await query(
                `INSERT INTO pet_shops (id, owner_id, name, category, address, image, tax_id, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
                [crypto.randomUUID(), userId, name, category || 'Food', address, image, tax_id]
            );
        }
        const shop = result.rows[0];

        // Write dynamic audit log
        try {
            const actorName = `${req.user.first_name} ${req.user.last_name}`;
            const actorRole = req.user.role || 'vendor';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', actorName, actorRole, 'Registered new business storefront', `Established storefront: ${shop.name} with tax ID: ${tax_id || 'N/A'}.`]
            );
        } catch (logErr) {
            console.error('Failed to write storefront registration audit log:', logErr);
        }

        res.status(200).json({ shop });
    } catch (error) {
        console.error('Error updating shop:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getVendorProducts = async (req, res) => {
    try {
        const userId = req.user.id;
        const shopRes = await query('SELECT id FROM pet_shops WHERE owner_id = $1', [userId]);
        if (shopRes.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        const shopId = shopRes.rows[0].id;
        const result = await query('SELECT * FROM marketplace_products WHERE shop_id = $1 ORDER BY created_at DESC', [shopId]);
        res.status(200).json({ products: result.rows });
    } catch (error) {
        console.error('Error fetching vendor products:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const addProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        // First get shop_id
        const shopRes = await query('SELECT id FROM pet_shops WHERE owner_id = $1', [userId]);
        if (shopRes.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        const shopId = shopRes.rows[0].id;
        
        const { title, description, category, base_price, image, badge } = req.body;
        
        const result = await query(
            `INSERT INTO marketplace_products (id, shop_id, title, description, category, base_price, image, badge)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [crypto.randomUUID(), shopId, title, description, category, base_price, image, badge]
        );
        
        const product = result.rows[0];

        // Write dynamic audit log
        try {
            const actorName = `${req.user.first_name} ${req.user.last_name}`;
            const actorRole = req.user.role || 'vendor';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['info', actorName, actorRole, 'Submitted product review', `Added marketplace product: ${title} under category ${category || 'Supplies'}.`]
            );
        } catch (logErr) {
            console.error('Failed to write product addition audit log:', logErr);
        }

        res.status(201).json({ product });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { title, description, category, base_price, image, badge } = req.body;

        // Verify that the product belongs to this vendor's shop
        const verifyRes = await query(
            `SELECT p.id FROM marketplace_products p 
             JOIN pet_shops s ON p.shop_id = s.id 
             WHERE p.id = $1 AND s.owner_id = $2`, 
            [id, userId]
        );
        if (verifyRes.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized to update this product' });
        }

        const result = await query(
            `UPDATE marketplace_products 
             SET title = $1, description = $2, category = $3, base_price = $4, image = $5, badge = $6
             WHERE id = $7 RETURNING *`,
            [title, description, category, base_price, image, badge, id]
        );

        res.status(200).json({ product: result.rows[0], message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Verify that the product belongs to this vendor's shop
        const verifyRes = await query(
            `SELECT p.id FROM marketplace_products p 
             JOIN pet_shops s ON p.shop_id = s.id 
             WHERE p.id = $1 AND s.owner_id = $2`, 
            [id, userId]
        );
        if (verifyRes.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized to delete this product' });
        }

        await query('DELETE FROM marketplace_products WHERE id = $1', [id]);
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createAdBanner = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, image_url, target_url, placement, duration, price } = req.body;
        
        if (!title || !image_url || !target_url || !placement || !duration || !price) {
            return res.status(400).json({ error: 'Missing required fields for ad banner request' });
        }

        const result = await query(
            `INSERT INTO ad_banners (id, vendor_id, title, image_url, target_url, placement, duration, price, status, payment_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'pending') RETURNING *`,
            [crypto.randomUUID(), userId, title, image_url, target_url, placement, duration, price]
        );

        res.status(201).json({ ad: result.rows[0], message: 'Ad banner request submitted successfully!' });
    } catch (error) {
        console.error('Error creating ad banner:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getVendorAdBanners = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query('SELECT * FROM ad_banners WHERE vendor_id = $1 ORDER BY created_at DESC', [userId]);
        res.status(200).json({ ads: result.rows });
    } catch (error) {
        console.error('Error fetching vendor ad banners:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const payForAdBanner = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await query(
            `UPDATE ad_banners 
             SET payment_status = 'paid' 
             WHERE id = $1 AND vendor_id = $2 AND status = 'approved' RETURNING *`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Approved ad banner not found or unauthorized' });
        }

        const ad = result.rows[0];

        // Write dynamic audit log
        try {
            const actorName = `${req.user.first_name} ${req.user.last_name}`;
            const actorRole = req.user.role || 'vendor';
            await query(
                `INSERT INTO audit_logs (level, user_name, role, action, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                ['success', actorName, actorRole, 'Processed ad campaign payment', `Simulated payment of EGP ${ad.price} successfully processed for campaign: ${ad.title}.`]
            );
        } catch (logErr) {
            console.error('Failed to write ad payment audit log:', logErr);
        }

        res.status(200).json({ ad, message: 'Payment simulated successfully. Ad is now active!' });
    } catch (error) {
        console.error('Error paying for ad banner:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
