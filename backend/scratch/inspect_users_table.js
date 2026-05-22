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
        const res = await pool.query('SELECT * FROM public.users LIMIT 1');
        if (res.rows.length === 0) {
            console.log('No rows in public.users, but here are the fields:');
            console.log(res.fields.map(f => f.name));
        } else {
            console.log('Row found! Column names:');
            console.log(Object.keys(res.rows[0]));
            console.log('Row values:');
            console.log(res.rows[0]);
        }
    } catch (err) {
        console.error('Error querying DB:', err);
    } finally {
        await pool.end();
    }
}

main();
