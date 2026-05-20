import { query } from './src/config/db.js';

async function addCoverUrl() {
    try {
        console.log('Adding cover_url to users table...');
        await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url VARCHAR(500);');
        console.log('Success!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

addCoverUrl();
