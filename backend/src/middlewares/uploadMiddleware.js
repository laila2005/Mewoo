import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure the upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        // Fallback to .jpg if no extension
        const finalExt = ext ? ext : '.jpg';
        cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + finalExt);
    }
});

// File filter (only allow images)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG and WEBP formats are allowed!'), false);
    }
};

// Create multer instance with 5MB limit for avatars
export const uploadAvatar = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: fileFilter
});

// Setup for ID Document Uploads
const idUploadDir = path.join(process.cwd(), 'public', 'uploads', 'ids');
if (!fs.existsSync(idUploadDir)) {
    fs.mkdirSync(idUploadDir, { recursive: true });
}

const idStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, idUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        const finalExt = ext ? ext : '.jpg';
        cb(null, 'id-' + uniqueSuffix + finalExt);
    }
});

// Create multer instance with 10MB limit for IDs
export const uploadID = multer({
    storage: idStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    },
    fileFilter: fileFilter
});
