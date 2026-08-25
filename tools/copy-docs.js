import fs from 'fs';
import path from 'path';

try {
    const src = './docs';
    const dest = './petpulse-web/dist/docs';

    // Ensure destination parent directory exists
    if (!fs.existsSync('./petpulse-web/dist')) {
        fs.mkdirSync('./petpulse-web/dist', { recursive: true });
    }
    
    fs.cpSync(src, dest, { recursive: true });
    console.log('✅ Documentation copied to dist/docs successfully.');
} catch (err) {
    console.error('⚠️ Warning: Failed to copy documentation:', err.message);
}
