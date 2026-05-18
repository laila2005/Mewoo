import { query } from './src/config/db.js';

async function run() {
    try {
        await query("ALTER TYPE user_role ADD VALUE 'banned'");
        console.log('success');
    } catch (e) {
        console.error('failed:', e.message);
    }
    process.exit(0);
}
run();
