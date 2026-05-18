import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
    user: 'petpulse_app',
    password: 'secure_app_password_2026',
    host: 'localhost',
    port: 5432,
    database: 'petpulse_db'
});

async function check() {
    const client = await pool.connect();
    const r = await client.query('SELECT id, email, password_hash FROM users WHERE email = $1', ['lolo@gmail.com']);
    
    if (r.rows.length === 0) {
        console.log('User lolo@gmail.com does not exist in the database.');
    } else {
        console.log('User found:', r.rows[0].email);
        const isValid = await bcrypt.compare('medfylolo', r.rows[0].password_hash);
        console.log('Password match:', isValid);
        
        if (!isValid) {
            // Update password to medfylolo just to be sure
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash('medfylolo', salt);
            await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'lolo@gmail.com']);
            console.log('Updated password to medfylolo');
        }
    }
    client.release();
    await pool.end();
}

check();
