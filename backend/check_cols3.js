import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'petpulse_app',
    password: 'secure_app_password_2026',
    host: 'localhost',
    port: 5432,
    database: 'petpulse_db',
});

async function run() {
    try {
        const res = await pool.query("SELECT cover_url FROM users LIMIT 1");
        console.log('users cover_url exists:', res.rows);
    } catch (e) {
        console.error('Error users cover_url:', e.message);
    }
    
    await pool.end();
}

run();
