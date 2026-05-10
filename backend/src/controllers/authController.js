import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export const register = async (req, res) => {
    try {
        const { email, password, first_name, last_name, role } = req.body;

        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user exists
        const userCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Email already in use' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert new user
        const insertUserQuery = `
            INSERT INTO users (email, password_hash, first_name, last_name, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, first_name, last_name, role;
        `;
        const newUser = await query(insertUserQuery, [email, password_hash, first_name, last_name, role || 'owner']);

        res.status(201).json({
            message: 'User registered successfully',
            user: newUser.rows[0]
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }

        // Find user
        const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            profile_pic_url: user.profile_pic_url || null
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            message: 'Login successful',
            token,
            user: payload
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { first_name, last_name, profile_pic_url } = req.body;

        const updates = [];
        const values = [];
        let idx = 1;

        if (first_name) { updates.push(`first_name = $${idx++}`); values.push(first_name); }
        if (last_name) { updates.push(`last_name = $${idx++}`); values.push(last_name); }
        if (profile_pic_url !== undefined) { updates.push(`profile_pic_url = $${idx++}`); values.push(profile_pic_url); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(userId);
        const result = await query(
            `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, email, first_name, last_name, role, profile_pic_url`,
            values
        );

        res.status(200).json({ user: result.rows[0] });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
