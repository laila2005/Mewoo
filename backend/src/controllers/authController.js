import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../config/db.js';
import crypto from 'crypto';
import { sendSMSCode } from '../services/smsService.js';
import { sendRecoveryEmail } from '../services/emailService.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

import { verifyID } from '../services/kycService.js';

export const register = async (req, res) => {
    try {
        const { email, password, first_name, last_name, role, clinic_name, license_number, specialties, phone } = req.body;

        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const phoneRegex = /^(\+20|0)?1[0125]\d{8}$|^(\+[1-9]\d{1,14})$/;
        if (phone && !phoneRegex.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone number format. Please use a valid Egyptian or International number.' });
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
            INSERT INTO users (email, password_hash, first_name, last_name, role, phone)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, email, first_name, last_name, role, phone;
        `;
        const newUser = await query(insertUserQuery, [email, password_hash, first_name, last_name, role || 'owner', phone || null]);
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
        // Generate JWT token so user is auto-logged in after registration
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Write real-time audit log to database
        await query(
            `INSERT INTO audit_logs (level, user_name, role, action, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            ['info', `${first_name} ${last_name}`, role || 'owner', 'New account registered', `Established a new pet community account with role ${role || 'owner'}.`]
        );

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
        } else if (directEmail && process.env.NODE_ENV !== 'production') {
            // Sandbox/simulation flow — ONLY ALLOWED IN NON-PRODUCTION
            email = directEmail;
            first_name = directFirstName || 'User';
            last_name = directLastName || '';
            profile_pic_url = null;
        } else {
            return res.status(400).json({ error: 'Missing Google credential or invalid flow' });
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
        const { first_name, last_name, profile_pic_url, cover_url, bio, custom_sections, mute_connection_posts, phone } = req.body;

        const updates = [];
        const values = [];
        let idx = 1;

        if (first_name) { updates.push(`first_name = $${idx++}`); values.push(first_name); }
        if (last_name) { updates.push(`last_name = $${idx++}`); values.push(last_name); }
        if (profile_pic_url !== undefined) { updates.push(`profile_pic_url = $${idx++}`); values.push(profile_pic_url); }
        if (cover_url !== undefined) { updates.push(`cover_url = $${idx++}`); values.push(cover_url); }
        if (bio !== undefined) { updates.push(`bio = $${idx++}`); values.push(bio); }
        if (mute_connection_posts !== undefined) { updates.push(`mute_connection_posts = $${idx++}`); values.push(mute_connection_posts); }
        if (phone !== undefined) { 
            const phoneRegex = /^(\+20|0)?1[0125]\d{8}$|^(\+[1-9]\d{1,14})$/;
            if (phone && !phoneRegex.test(phone)) {
                return res.status(400).json({ error: 'Invalid phone number format. Please use a valid Egyptian or International number.' });
            }
            updates.push(`phone = $${idx++}`); values.push(phone); 
        }

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
            if (cover_url !== undefined) { provUpdates.push(`cover_url = $${pIdx++}`); provValues.push(cover_url); }
            if (custom_sections !== undefined) { provUpdates.push(`custom_sections = $${pIdx++}`); provValues.push(JSON.stringify(custom_sections)); }

            if (provUpdates.length > 0) {
                provValues.push(userId);
                await query(`UPDATE ${table} SET ${provUpdates.join(', ')} WHERE user_id = $${pIdx}`, provValues);
            }
        }

        // Return updated user with ALL fields needed by the frontend
        const result = await query(
            'SELECT id, email, phone, first_name, last_name, role, profile_pic_url, cover_url, bio, latitude, longitude, neighborhood, mute_connection_posts FROM users WHERE id = $1',
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

export const updateLocation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { latitude, longitude, neighborhood } = req.body;

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        await query(
            `UPDATE users 
             SET latitude = $1, longitude = $2, neighborhood = $3, updated_at = NOW() 
             WHERE id = $4`,
            [latitude, longitude, neighborhood || null, userId]
        );

        // Fetch updated user
        const result = await query(
            `SELECT id, email, first_name, last_name, profile_pic_url, cover_url, role, bio, latitude, longitude, neighborhood, mute_connection_posts 
             FROM users WHERE id = $1`,
            [userId]
        );

        res.status(200).json({ 
            message: 'Location updated successfully', 
            user: result.rows[0] 
        });
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ error: 'Server error during location update' });
    }
};

/**
 * Request Password Recovery
 * Generates a 6-digit OTP code or secure link and dispatches it.
 */
export const forgotPassword = async (req, res) => {
    try {
        const { deliveryMethod, identifier, emailMethod } = req.body;

        // Verify recipient exists in public users table
        let userResult;
        if (deliveryMethod === 'email') {
            userResult = await query('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [identifier]);
        } else if (deliveryMethod === 'phone') {
            userResult = await query('SELECT id, phone FROM users WHERE phone = $1 LIMIT 1', [identifier]);
        }

        if (!userResult || userResult.rows.length === 0) {
            return res.status(404).json({ error: 'No registered user was found with that contact info.' });
        }

        const user = userResult.rows[0];
        const userId = user.id;

        // Rate Limiting Gate: Check if a code/link was generated within the last 60 seconds
        const recentRequest = await query(
            `SELECT created_at FROM password_recoveries 
             WHERE recipient = $1 AND created_at > NOW() - INTERVAL '1 minute' 
             LIMIT 1`,
            [identifier]
        );
        if (recentRequest.rows.length > 0) {
            return res.status(429).json({ error: 'Please wait at least 60 seconds before requesting another code or link.' });
        }

        // Daily/Hourly Abuse Check: Limit to 5 attempts per hour per contact address
        const hourlyRequests = await query(
            `SELECT COUNT(*) FROM password_recoveries 
             WHERE recipient = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
            [identifier]
        );
        if (parseInt(hourlyRequests.rows[0].count, 10) >= 5) {
            return res.status(429).json({ error: 'Too many recovery requests. Please wait an hour before trying again.' });
        }

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 Minutes validity

        if (deliveryMethod === 'email') {
            if (emailMethod === 'link') {
                const rawToken = crypto.randomBytes(32).toString('hex');
                const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

                const insertRes = await query(
                    `INSERT INTO password_recoveries (user_id, verification_type, recipient, reset_token_hash, expires_at)
                     VALUES ($1, 'email_link', $2, $3, $4) RETURNING id`,
                    [userId, identifier, tokenHash, expiresAt]
                );

                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const link = `${frontendUrl}/reset-password?token=${rawToken}`;
                
                await sendRecoveryEmail(identifier, { type: 'link', link });

                return res.status(200).json({
                    success: true,
                    message: 'A secure password reset link has been dispatched to your email.',
                    sessionId: insertRes.rows[0].id
                });
            } else {
                // Email OTP Code
                const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
                const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

                const insertRes = await query(
                    `INSERT INTO password_recoveries (user_id, verification_type, recipient, otp_code_hash, expires_at)
                     VALUES ($1, 'email_code', $2, $3, $4) RETURNING id`,
                    [userId, identifier, otpHash, expiresAt]
                );

                await sendRecoveryEmail(identifier, { type: 'code', code: otpCode });

                return res.status(200).json({
                    success: true,
                    message: 'A 6-digit recovery code has been sent to your email address.',
                    sessionId: insertRes.rows[0].id
                });
            }
        } else if (deliveryMethod === 'phone') {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

            const insertRes = await query(
                `INSERT INTO password_recoveries (user_id, verification_type, recipient, otp_code_hash, expires_at)
                 VALUES ($1, 'phone_code', $2, $3, $4) RETURNING id`,
                [userId, identifier, otpHash, expiresAt]
            );

            await sendSMSCode(identifier, otpCode);

            return res.status(200).json({
                success: true,
                message: 'A 6-digit recovery code has been sent to your phone via SMS.',
                sessionId: insertRes.rows[0].id
            });
        }

    } catch (error) {
        console.error('Forgot password handler error:', error);
        res.status(500).json({ error: 'Server error occurred while preparing password recovery.' });
    }
};

/**
 * Verify Recovery Code
 * Verifies a 6-digit OTP, marks record as used, and returns short-lived reset JWT.
 */
export const verifyRecoveryCode = async (req, res) => {
    try {
        const { identifier, code } = req.body;

        const result = await query(
            `SELECT r.*, u.id as user_id 
             FROM password_recoveries r
             JOIN users u ON r.user_id = u.id
             WHERE r.recipient = $1 
               AND r.is_used = FALSE 
               AND r.expires_at > NOW()
             ORDER BY r.created_at DESC`,
            [identifier]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'The code is invalid or has expired. Please request a new one.' });
        }

        const record = result.rows[0];
        
        if (!record.otp_code_hash) {
            return res.status(400).json({ error: 'Invalid recovery method session.' });
        }

        const clientCodeHash = crypto.createHash('sha256').update(code).digest('hex');
        if (clientCodeHash !== record.otp_code_hash) {
            return res.status(400).json({ error: 'The verification code is incorrect.' });
        }

        // Single-use: Mark recovery as completed/used
        await query('UPDATE password_recoveries SET is_used = TRUE WHERE id = $1', [record.id]);

        // Issue highly secure, short-lived reset token (expiring in 5 minutes)
        const resetToken = jwt.sign(
            { id: record.user_id, purpose: 'reset-password' },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
        );

        res.status(200).json({
            success: true,
            message: 'Code verified successfully.',
            resetToken
        });

    } catch (error) {
        console.error('Verify recovery code error:', error);
        res.status(500).json({ error: 'Server error during code verification.' });
    }
};

/**
 * Reset Password
 * Accepts newPassword and verification token, updates users table.
 */
export const resetPassword = async (req, res) => {
    try {
        const { newPassword, resetToken } = req.body;

        // Determine if token is email link (random hex) or verification JWT
        const isHex = /^[a-f0-9]{64}$/i.test(resetToken);

        if (isHex) {
            // Check random hex token (direct email recovery link)
            const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

            const result = await query(
                `SELECT * FROM password_recoveries 
                 WHERE reset_token_hash = $1 
                   AND is_used = FALSE 
                   AND expires_at > NOW() 
                 LIMIT 1`,
                [tokenHash]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
            }

            const record = result.rows[0];

            // Mark link as used
            await query('UPDATE password_recoveries SET is_used = TRUE WHERE id = $1', [record.id]);

            // Hash & Update password
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(newPassword, salt);

            await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, record.user_id]);

            return res.status(200).json({
                success: true,
                message: 'Your password has been successfully updated.'
            });
        } else {
            // Verify JWT recovery token
            try {
                const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
                
                if (decoded.purpose !== 'reset-password') {
                    return res.status(400).json({ error: 'Invalid password recovery session.' });
                }

                // Hash & Update password
                const salt = await bcrypt.genSalt(10);
                const password_hash = await bcrypt.hash(newPassword, salt);

                await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, decoded.id]);

                return res.status(200).json({
                    success: true,
                    message: 'Your password has been successfully updated.'
                });
            } catch (jwtErr) {
                return res.status(400).json({ error: 'Your password recovery session has expired or is invalid.' });
            }
        }

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Server error during password reset.' });
    }
};

