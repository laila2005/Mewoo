import express from 'express';
import multer from 'multer';
import { optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Use memory storage so we don't need to write to disk. Images only, 5MB max —
// this is a thin proxy to Cloudinary, so reject anything that isn't an image
// server-side (we can't trust the client's own type check).
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (/^image\//.test(file.mimetype)) return cb(null, true);
        cb(new Error('Only image files are allowed'));
    },
});

// Only these folders may be written — prevents the open proxy from being used to
// scatter arbitrary uploads across the Cloudinary account.
const ALLOWED_FOLDERS = new Set(['petpulse/symptoms', 'petpulse/general', 'petpulse/pets', 'petpulse/community']);

// optionalAuth (not requireAuth): VetAI symptom-photo intake is available to
// guests too, so a signed-in token is used when present but never required.
router.post('/cloudinary', optionalAuth, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message || 'Upload rejected' });
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const uploadPreset = req.body.upload_preset || 'PetPulse';
        const folder = ALLOWED_FOLDERS.has(req.body.folder) ? req.body.folder : 'petpulse/general';
        
        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        const formData = new FormData();
        formData.append('file', dataURI);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);

        const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dov42snih/image/upload', {
            method: 'POST',
            body: formData
        });

        const cloudData = await cloudRes.json();

        if (!cloudRes.ok) {
            console.error('Cloudinary Proxy Error:', cloudData);
            return res.status(cloudRes.status).json({ error: cloudData.error?.message || 'Failed to proxy upload to Cloudinary' });
        }

        res.json({ secure_url: cloudData.secure_url });
    } catch (error) {
        console.error('Proxy Upload Error:', error);
        res.status(500).json({ error: 'Internal server error during upload proxy' });
    }
});

export default router;
