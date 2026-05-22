import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL is not set!');
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        const email = 'laila.mohamed.fikry@gmail.com';
        const res = await pool.query('SELECT id, email, first_name, last_name, profile_pic_url, cover_url, role FROM users WHERE email = $1', [email]);
        console.log('USER RECORD IN DB:', res.rows[0]);
    } catch (err) {
        console.error('Error querying user:', err);
    } finally {
        await pool.end();
    }
}

main();
