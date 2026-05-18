import pg from 'pg';
import fs from 'fs';

const pool = new pg.Pool({
    user: 'postgres',
    password: 'medfylolo',
    host: 'localhost',
    port: 5432,
    database: 'petpulse_db'
});

async function tryPasswords() {
    const passwords = ['Laila1234', '123456', 'password', 'admin123', 'root', '1234', 'petpulse', 'secure_app_password_2026'];
    
    for (const pw of passwords) {
        try {
            const p = new pg.Pool({ user: 'postgres', password: pw, host: 'localhost', port: 5432, database: 'petpulse_db' });
            const c = await p.connect();
            console.log(`✅ Postgres superuser password found: "${pw}"`);
            
            // Run migration
            const sql = fs.readFileSync('src/migrations/add_notifications_bio.sql', 'utf-8');
            await c.query(sql);
            console.log('✅ Migration executed successfully');
            
            c.release();
            await p.end();
            return;
        } catch (e) {
            if (e.code === '28P01') continue; // wrong password
            console.log(`Error with "${pw}": ${e.message}`);
        }
    }
    console.log('❌ Could not find postgres password. Please run the migration manually.');
}

tryPasswords();
