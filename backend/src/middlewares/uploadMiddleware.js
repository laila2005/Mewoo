import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure the upload directory exists
const isVercel = !!process.env.VERCEL;
const uploadDir = isVercel 
    ? path.join('/tmp', 'uploads', 'avatars')
    : path.join(process.cwd(), 'public', 'uploads', 'avatars');

try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (err) {
    console.warn('Warning: Could not create upload directory:', uploadDir, err.message);
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
const idUploadDir = isVercel
    ? path.join('/tmp', 'uploads', 'ids')
    : path.join(process.cwd(), 'public', 'uploads', 'ids');

try {
    if (!fs.existsSync(idUploadDir)) {
        fs.mkdirSync(idUploadDir, { recursive: true });
    }
} catch (err) {
    console.warn('Warning: Could not create ID upload directory:', idUploadDir, err.message);
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

// ── F-06: verify the real file type by its signature bytes ──────────
// The client-declared MIME type and filename extension are attacker-controlled,
// so a non-image payload can pass the multer fileFilter. This middleware runs
// AFTER multer has written the file: it sniffs the leading bytes, rejects and
// deletes anything that isn't a genuine JPG/PNG/WEBP, and renames the stored
// file to the extension derived from the VERIFIED format (never the filename).
function sniffImageExt(buf) {
    if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return '.jpg';
    if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47
        && buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) return '.png';
    if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return '.webp';
    return null;
}

export function verifyImageSignature(req, res, next) {
    if (!req.file) return next(); // optional upload field — nothing to check
    try {
        const fd = fs.openSync(req.file.path, 'r');
        const head = Buffer.alloc(12);
        fs.readSync(fd, head, 0, 12, 0);
        fs.closeSync(fd);

        const realExt = sniffImageExt(head);
        if (!realExt) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ error: 'Uploaded file is not a valid JPG, PNG or WEBP image.' });
        }

        // Store under the verified extension rather than the client-supplied one.
        const cur = req.file.path;
        const curExt = path.extname(cur).toLowerCase();
        if (curExt !== realExt) {
            const fixed = cur.slice(0, cur.length - curExt.length) + realExt;
            try {
                fs.renameSync(cur, fixed);
                req.file.path = fixed;
                req.file.filename = path.basename(fixed);
            } catch (e) { /* keep original name on rename failure */ }
        }
        next();
    } catch (e) {
        console.warn('[upload] signature verification error:', e.message);
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Could not validate the uploaded file.' });
    }
}
