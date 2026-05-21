import { query } from '../src/config/db.js';

async function migrate() {
    try {
        console.log('Adding last_seen column to users table...');
        await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
        console.log('✅ Column last_seen added or already exists.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
