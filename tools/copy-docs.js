import fs from 'fs';
import path from 'path';

try {
    const src = './docs';
    const dest = './petpluse-web/dist/docs';
    
    // Ensure destination parent directory exists
    if (!fs.existsSync('./petpluse-web/dist')) {
        fs.mkdirSync('./petpluse-web/dist', { recursive: true });
    }
    
    fs.cpSync(src, dest, { recursive: true });
    console.log('✅ Documentation copied to dist/docs successfully.');
} catch (err) {
    console.error('⚠️ Warning: Failed to copy documentation:', err.message);
}
