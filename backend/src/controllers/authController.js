import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../config/db.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

import { verifyID } from '../services/kycService.js';

export const register = async (req, res) => {
    try {
        const { email, password, first_name, last_name, role, clinic_name, license_number, specialties } = req.body;

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

        // Perform OCR verification if role is vet or trainer
        let verificationStatus = 'pending';
        let kycReason = null;
        if (role === 'vet' || role === 'trainer') {
            const kycResult = await verifyID(req.file, `${first_name} ${last_name}`);
            verificationStatus = kycResult.status;
            kycReason = kycResult.reason;
            
            if (verificationStatus === 'rejected') {
                return res.status(400).json({ error: 'ID Verification Failed', reason: kycReason });
            }
        }

        // Insert new user
        const insertUserQuery = `
            INSERT INTO users (email, password_hash, first_name, last_name, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, first_name, last_name, role;
        `;
        const newUser = await query(insertUserQuery, [email, password_hash, first_name, last_name, role || 'owner']);
        const userId = newUser.rows[0].id;

        // Insert into professional profiles if applicable
        if (role === 'vet') {
            await query(
                `INSERT INTO vet_profiles (user_id, clinic_name, license_number, status) VALUES ($1, $2, $3, $4)`,
                [userId, clinic_name || '', license_number || '', verificationStatus]
            );
        } else if (role === 'trainer') {
            const specialtiesArray = specialties ? specialties.split(',').map(s => s.trim()) : [];
            await query(
                `INSERT INTO trainer_profiles (user_id, specialties, status) VALUES ($1, $2, $3)`,
                [userId, specialtiesArray, verificationStatus]
            );
        }

        res.status(201).json({
            message: 'User registered successfully',
            user: newUser.rows[0],
            kyc_status: role === 'vet' || role === 'trainer' ? verificationStatus : undefined,
            kyc_reason: kycReason
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

export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ error: 'Missing Google credential' });
        }

        // Verify the token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload['email'];
        const first_name = payload['given_name'] || 'User';
        const last_name = payload['family_name'] || '';
        const profile_pic_url = payload['picture'];

        // Check if user exists in DB
        const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
        let user;

        if (userResult.rows.length === 0) {
            // User does not exist, auto-register them
            // Generate a secure random dummy password for Google users
            const dummyPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(dummyPassword, salt);

            const insertQuery = `
                INSERT INTO users (email, password_hash, first_name, last_name, profile_pic_url, role)
                VALUES ($1, $2, $3, $4, $5, 'owner')
                RETURNING *;
            `;
            const newReq = await query(insertQuery, [email, password_hash, first_name, last_name, profile_pic_url]);
            user = newReq.rows[0];
        } else {
            user = userResult.rows[0];
            
            // Optionally update their profile pic if it changed, but let's just log them in
            if (profile_pic_url && !user.profile_pic_url) {
                await query('UPDATE users SET profile_pic_url = $1 WHERE id = $2', [profile_pic_url, user.id]);
                user.profile_pic_url = profile_pic_url;
            }
        }

        // Generate PetPulse JWT
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            profile_pic_url: user.profile_pic_url || null
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            message: 'Google login successful',
            token,
            user: tokenPayload
        });

    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ error: 'Server error during Google login' });
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

export const updatePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;

        const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        const new_password_hash = await bcrypt.hash(new_password, salt);

        await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [new_password_hash, userId]);

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
