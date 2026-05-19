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
        const res = await pool.query("SELECT cover_url, custom_sections FROM vet_profiles LIMIT 1");
        console.log('Columns exist:', res.rows);
    } catch (e) {
        console.error('Error:', e.message);
    }
    await pool.end();
}

run();
