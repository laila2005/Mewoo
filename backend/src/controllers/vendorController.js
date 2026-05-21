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
        const { name, category, address, image } = req.body;
        
        const result = await query(
            `UPDATE pet_shops 
             SET name = $1, category = $2, address = $3, image = $4 
             WHERE owner_id = $5 RETURNING *`,
            [name, category, address, image, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        res.status(200).json({ shop: result.rows[0] });
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
        
        res.status(201).json({ product: result.rows[0] });
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
