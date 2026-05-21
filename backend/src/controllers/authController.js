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

        // Perform OCR verification if role is vet or trainer AND a file was uploaded
        let verificationStatus = 'pending';
        let kycReason = null;
        if ((role === 'vet' || role === 'trainer') && req.file) {
            const kycResult = await verifyID(req.file, `${first_name} ${last_name}`);
            verificationStatus = kycResult.status;
            kycReason = kycResult.reason;
            
            if (verificationStatus === 'rejected') {
                return res.status(400).json({ error: 'ID Verification Failed', reason: kycReason });
            }
        } else if (role === 'vet' || role === 'trainer') {
            // No file uploaded — set to pending for admin review
            verificationStatus = 'pending';
            kycReason = 'No ID document uploaded. Awaiting admin review.';
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
                [userId, clinic_name || '', license_number || `TEMP-${userId}`, verificationStatus]
            );
        } else if (role === 'trainer') {
            const specialtiesArray = specialties ? specialties.split(',').map(s => s.trim()) : [];
            await query(
                `INSERT INTO trainer_profiles (user_id, specialties, status) VALUES ($1, $2, $3)`,
                [userId, specialtiesArray, verificationStatus]
            );
        } else if (role === 'vendor') {
            const { shop_name, shop_category, business_address, tax_id } = req.body;
            await query(
                `INSERT INTO pet_shops (owner_id, name, category, address, tax_id, status) VALUES ($1, $2, $3, $4, $5, 'pending')`,
                [userId, shop_name || `${first_name}'s Shop`, shop_category || 'General', business_address || '', tax_id || '']
            );
        }

        // Generate JWT token so user is auto-logged in after registration
        const tokenPayload = {
            id: newUser.rows[0].id,
            email: newUser.rows[0].email,
            role: newUser.rows[0].role,
            first_name: newUser.rows[0].first_name,
            last_name: newUser.rows[0].last_name,
            profile_pic_url: null,
            cover_url: null
        };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: tokenPayload,
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

        // Find user — email only (no first_name fallback for security)
        const userResult = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        // Check if banned BEFORE doing any expensive bcrypt work
        if (user.password_hash && user.password_hash.startsWith('BANNED:')) {
            return res.status(403).json({ error: 'Your account has been banned by an administrator.' });
        }

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
            profile_pic_url: user.profile_pic_url || null,
            cover_url: user.cover_url || null
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
        const { credential, email: directEmail, first_name: directFirstName, last_name: directLastName, token: mockToken } = req.body;

        let email, first_name, last_name, profile_pic_url;

        if (credential && credential !== 'mock-google-token') {
            // Real Google OAuth flow — verify the ID token
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            email = payload['email'];
            first_name = payload['given_name'] || 'User';
            last_name = payload['family_name'] || '';
            profile_pic_url = payload['picture'];
        } else if (directEmail) {
            // Sandbox/simulation flow — the frontend sends email and name directly
            email = directEmail;
            first_name = directFirstName || 'User';
            last_name = directLastName || '';
            profile_pic_url = null;
        } else {
            return res.status(400).json({ error: 'Missing Google credential or email' });
        }

        // Check if user exists in DB
        const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
        let user;

        if (userResult.rows.length === 0) {
            // User does not exist, auto-register them
            const dummyPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(dummyPassword, salt);

            let role = 'owner';
            if (email.includes('.vet') || email.includes('vet@')) {
                role = 'vet';
            } else if (email.includes('.trainer') || email.includes('trainer@')) {
                role = 'trainer';
            }

            const insertQuery = `
                INSERT INTO users (email, password_hash, first_name, last_name, profile_pic_url, role)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *;
            `;
            const newReq = await query(insertQuery, [email, password_hash, first_name, last_name, profile_pic_url, role]);
            user = newReq.rows[0];
        } else {
            user = userResult.rows[0];
            
            // Check if banned
            if (user.password_hash && user.password_hash.startsWith('BANNED:')) {
                return res.status(403).json({ error: 'Your account has been banned by an administrator.' });
            }
            
            // Optionally update their profile pic if it changed
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
            profile_pic_url: user.profile_pic_url || null,
            cover_url: user.cover_url || null
        };

        const jwtToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            message: 'Google login successful',
            token: jwtToken,
            user: tokenPayload
        });

    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ error: error.message || 'Server error during Google login' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { first_name, last_name, profile_pic_url, cover_url, bio, custom_sections } = req.body;

        const updates = [];
        const values = [];
        let idx = 1;

        if (first_name) { updates.push(`first_name = $${idx++}`); values.push(first_name); }
        if (last_name) { updates.push(`last_name = $${idx++}`); values.push(last_name); }
        if (profile_pic_url !== undefined) { updates.push(`profile_pic_url = $${idx++}`); values.push(profile_pic_url); }
        if (cover_url !== undefined) { updates.push(`cover_url = $${idx++}`); values.push(cover_url); }
        if (bio !== undefined) { updates.push(`bio = $${idx++}`); values.push(bio); }

        if (updates.length > 0) {
            values.push(userId);
            await query(
                `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
                values
            );
        }

        // Update provider specific fields
        if (req.user.role === 'vet' || req.user.role === 'trainer') {
            const table = req.user.role === 'vet' ? 'vet_profiles' : 'trainer_profiles';
            const provUpdates = [];
            const provValues = [];
            let pIdx = 1;

            if (bio !== undefined) { provUpdates.push(`bio = $${pIdx++}`); provValues.push(bio); }
            if (custom_sections !== undefined) { provUpdates.push(`custom_sections = $${pIdx++}`); provValues.push(JSON.stringify(custom_sections)); }

            if (provUpdates.length > 0) {
                provValues.push(userId);
                await query(`UPDATE ${table} SET ${provUpdates.join(', ')} WHERE user_id = $${pIdx}`, provValues);
            }
        }

        // Return updated user with ALL fields needed by the frontend
        const result = await query(
            'SELECT id, email, first_name, last_name, role, profile_pic_url, cover_url, bio FROM users WHERE id = $1',
            [userId]
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
