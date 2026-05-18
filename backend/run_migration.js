import pg from 'pg';
import fs from 'fs';

const pool = new pg.Pool({
    user: 'postgres',
    password: 'medfylolo',
    host: 'localhost',
    port: 5432,
    database: 'petpulse_db'
});

async function run() {
    const c = await pool.connect();
    const sql = fs.readFileSync('src/migrations/add_notifications_bio.sql', 'utf-8');
    await c.query(sql);
    console.log('✅ Migration executed successfully');
    c.release();
    await pool.end();
}
run().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
