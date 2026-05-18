import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
    user: 'petpulse_app',
    password: 'secure_app_password_2026',
    host: 'localhost',
    port: 5432,
    database: 'petpulse_db'
});

async function addLolo() {
    const client = await pool.connect();
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('medfylolo', salt);
        
        await client.query(`
            INSERT INTO users (email, password_hash, first_name, last_name, role) 
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        `, ['lolo@gmail.com', hash, 'Lolo', 'Owner', 'owner']);
        
        console.log('✅ Re-created user lolo@gmail.com with password medfylolo');
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}
addLolo();
