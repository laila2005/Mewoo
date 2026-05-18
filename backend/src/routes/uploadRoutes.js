import express from 'express';
import multer from 'multer';

const router = express.Router();

// Use memory storage so we don't need to write to disk
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/cloudinary', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const uploadPreset = req.body.upload_preset || 'PetPulse';
        
        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        const formData = new FormData();
        formData.append('file', dataURI);
        formData.append('upload_preset', uploadPreset);

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
