import { query } from './src/config/db.js';
import fs from 'fs';
import path from 'path';

async function run() {
    try {
        const sql = fs.readFileSync(path.join(process.cwd(), 'src/migrations/comments_update.sql'), 'utf-8');
        await query(sql);
        console.log('Migration successful');
    } catch (e) {
        console.error('Migration failed:', e.message);
    }
    process.exit(0);
}
run();
