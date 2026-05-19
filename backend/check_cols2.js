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
        const res = await pool.query("SELECT custom_sections FROM vet_profiles LIMIT 1");
        console.log('vet_profiles custom_sections exists:', res.rows);
    } catch (e) {
        console.error('Error:', e.message);
    }
    
    try {
        const res2 = await pool.query("SELECT custom_sections FROM trainer_profiles LIMIT 1");
        console.log('trainer_profiles custom_sections exists:', res2.rows);
    } catch (e) {
        console.error('Error2:', e.message);
    }
    await pool.end();
}

run();
