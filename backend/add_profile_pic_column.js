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
        console.log('Adding profile_pic_url to users table...');
        await pool.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_pic_url VARCHAR;`);
        console.log('Column profile_pic_url verified/added successfully.');
        
        // Verify columns
        const res = await pool.query('SELECT * FROM public.users LIMIT 1');
        console.log('Current public.users columns:', Object.keys(res.rows[0] || {}));
    } catch (err) {
        console.error('Error modifying DB:', err);
    } finally {
        await pool.end();
    }
}

main();
