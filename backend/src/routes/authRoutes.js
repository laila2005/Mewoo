import express from 'express';
import { register, login, googleLogin, updateProfile, updatePassword, deleteAccount } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateBody, schemas } from '../middlewares/inputValidator.js';
import { query } from '../config/db.js';

const router = express.Router();

import { uploadAvatar, uploadID } from '../middlewares/uploadMiddleware.js';

// Public routes — with input validation (Story 3)
router.post('/register', uploadID.single('national_id'), validateBody(schemas.register), register);
router.post('/login', validateBody(schemas.login), login);
router.post('/google', googleLogin);

// Protected routes
router.get('/me', requireAuth, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, email, first_name, last_name, role, profile_pic_url, cover_url, bio, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const postsResult = await query(
            'SELECT COUNT(*) FROM community_posts WHERE user_id = $1',
            [req.user.id]
        );
        
        const petsResult = await query(
            'SELECT COUNT(*) FROM pets WHERE owner_id = $1',
            [req.user.id]
        );
        
        const user = result.rows[0];
        user.posts_count = parseInt(postsResult.rows[0].count, 10) || 0;
        user.pets_count = parseInt(petsResult.rows[0].count, 10) || 0;
        
        if (user.role === 'vet') {
            const vetResult = await query('SELECT title, experience, bio, cover_url, custom_sections, status, clinic_name, license_number, specialties, degrees, consultation_fee, address, available_days, working_hours FROM vet_profiles WHERE user_id = $1', [user.id]);
            if (vetResult.rows.length > 0) {
                Object.assign(user, vetResult.rows[0]);
            }
        } else if (user.role === 'trainer') {
            const trainerResult = await query('SELECT title, experience, bio, cover_url, custom_sections, status, specialties, license_number, degrees, consultation_fee, address, available_days, working_hours FROM trainer_profiles WHERE user_id = $1', [user.id]);
            if (trainerResult.rows.length > 0) {
                Object.assign(user, trainerResult.rows[0]);
            }
        } else if (user.role === 'vendor') {
            const shopResult = await query('SELECT id AS shop_id, name AS shop_name, category AS shop_category, address AS shop_address, tax_id, status FROM pet_shops WHERE owner_id = $1', [user.id]);
            if (shopResult.rows.length > 0) {
                Object.assign(user, shopResult.rows[0]);
            }
        }
        
        res.status(200).json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

// Admin: Get all users
router.get('/users', requireAuth, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, email, first_name, last_name, role, profile_pic_url, created_at FROM users ORDER BY created_at DESC'
        );
        res.status(200).json({ users: result.rows });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});



router.put('/profile', requireAuth, validateBody(schemas.updateProfile), updateProfile);
router.put('/password', requireAuth, validateBody(schemas.updatePassword), updatePassword);
router.delete('/me', requireAuth, deleteAccount);

// Handle avatar upload
router.post('/upload-avatar', requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a file' });
        }
        
        // Construct the URL path (relative to the public directory)
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        
        // Update user profile in DB
        const result = await query(
            'UPDATE users SET profile_pic_url = $1, updated_at = NOW() WHERE id = $2 RETURNING profile_pic_url',
            [avatarUrl, req.user.id]
        );
        
        res.status(200).json({ 
            message: 'Avatar uploaded successfully',
            profile_pic_url: result.rows[0].profile_pic_url
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Something went wrong during upload' });
    }
});

// Handle cover upload
router.post('/upload-cover', requireAuth, uploadAvatar.single('cover'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a file' });
        }
        
        const coverUrl = `/uploads/avatars/${req.file.filename}`;
        
        if (req.user.role === 'vet') {
            await query('UPDATE vet_profiles SET cover_url = $1 WHERE user_id = $2', [coverUrl, req.user.id]);
        } else if (req.user.role === 'trainer') {
            await query('UPDATE trainer_profiles SET cover_url = $1 WHERE user_id = $2', [coverUrl, req.user.id]);
        }
        
        res.status(200).json({ 
            message: 'Cover uploaded successfully',
            cover_url: coverUrl
        });
    } catch (error) {
        console.error('Cover upload error:', error);
        res.status(500).json({ error: 'Something went wrong during upload' });
    }
});

// Pro profile update endpoint
router.put('/profile/pro', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const {
            title,
            experience,
            specialties,
            degrees,
            consultation_fee,
            address,
            available_days,
            working_hours,
            bio,
            clinic_name,
            license_number,
            custom_sections
        } = req.body;

        if (role !== 'vet' && role !== 'trainer') {
            return res.status(403).json({ error: 'Only vets and trainers can update professional profile.' });
        }

        const table = role === 'vet' ? 'vet_profiles' : 'trainer_profiles';

        // Check if profile exists first
        const checkRes = await query(`SELECT user_id FROM ${table} WHERE user_id = $1`, [userId]);
        if (checkRes.rows.length === 0) {
            // Insert if missing
            if (role === 'vet') {
                await query(`INSERT INTO vet_profiles (user_id, clinic_name, license_number) VALUES ($1, $2, $3)`, [userId, clinic_name || 'My Clinic', license_number || `LIC-${userId}`]);
            } else {
                await query(`INSERT INTO trainer_profiles (user_id) VALUES ($1)`, [userId]);
            }
        }

        // Build dynamic query
        const updates = [];
        const values = [];
        let idx = 1;

        if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
        if (experience !== undefined) { updates.push(`experience = $${idx++}`); values.push(parseInt(experience) || 0); }
        if (degrees !== undefined) { updates.push(`degrees = $${idx++}`); values.push(degrees); }
        if (consultation_fee !== undefined) { updates.push(`consultation_fee = $${idx++}`); values.push(parseFloat(consultation_fee) || 0); }
        if (address !== undefined) { updates.push(`address = $${idx++}`); values.push(address); }
        if (working_hours !== undefined) { updates.push(`working_hours = $${idx++}`); values.push(JSON.stringify(working_hours)); }
        if (bio !== undefined) { 
            updates.push(`bio = $${idx++}`); 
            values.push(bio); 
            await query('UPDATE users SET bio = $1 WHERE id = $2', [bio, userId]);
        }

        if (specialties !== undefined) {
            updates.push(`specialties = $${idx++}`);
            values.push(Array.isArray(specialties) ? specialties : specialties.split(',').map(s => s.trim()));
        }
        if (available_days !== undefined) {
            updates.push(`available_days = $${idx++}`);
            values.push(available_days);
        }

        if (role === 'vet') {
            if (clinic_name !== undefined) { updates.push(`clinic_name = $${idx++}`); values.push(clinic_name); }
            if (license_number !== undefined) { updates.push(`license_number = $${idx++}`); values.push(license_number); }
        } else if (role === 'trainer') {
            if (license_number !== undefined) { updates.push(`license_number = $${idx++}`); values.push(license_number); }
        }

        if (custom_sections !== undefined) {
            updates.push(`custom_sections = $${idx++}`);
            values.push(typeof custom_sections === 'string' ? custom_sections : JSON.stringify(custom_sections));
        }

        if (updates.length > 0) {
            values.push(userId);
            await query(`UPDATE ${table} SET ${updates.join(', ')}, created_at = created_at WHERE user_id = $${idx}`, values);
        }

        res.status(200).json({ message: 'Professional profile updated successfully' });
    } catch (error) {
        console.error('Update pro profile error:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

export default router;
