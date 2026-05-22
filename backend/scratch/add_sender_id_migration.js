import { query } from '../src/config/db.js';

async function run() {
    try {
        console.log('Adding sender_id column to notifications table...');
        await query(`
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES users(id) ON DELETE SET NULL;
        `);
        console.log('✅ Column sender_id added successfully or already exists.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        process.exit(0);
    }
}

run();
