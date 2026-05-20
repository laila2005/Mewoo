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
