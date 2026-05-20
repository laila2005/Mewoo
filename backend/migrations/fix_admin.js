import bcrypt from 'bcryptjs';
import { query } from './src/config/db.js';

async function fixAdmin() {
    const hash = await bcrypt.hash('admin', 10);
    await query("UPDATE users SET password_hash = $1 WHERE email = 'admin@petpulse.com'", [hash]);
    console.log('Admin password updated to admin');
    process.exit(0);
}
fixAdmin();
