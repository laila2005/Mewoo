import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Construct the local database connection string from environment variables or use safe defaults
const user = process.env.POSTGRES_USER || 'petpulse_app';
const password = process.env.POSTGRES_PASSWORD || 'secure_app_password_2026';
const host = process.env.POSTGRES_HOST || 'localhost';
const port = process.env.POSTGRES_PORT || 5432;
const database = process.env.POSTGRES_DB || 'petpulse_db';

const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;

console.log(`🔌 Connecting to local database: postgresql://${user}:****@${host}:${port}/${database}`);

const pool = new pg.Pool({
    connectionString,
    // For local database, SSL is typically disabled, but we can configure it safely:
    ssl: host !== 'localhost' && host !== '127.0.0.1' ? { rejectUnauthorized: false } : false
});

async function main() {
    try {
        console.log('⚡ Starting local database backup process...');
        
        // 1. Get all public tables
        const tablesRes = await pool.query(
            `SELECT table_name 
             FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
        );
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log(`📋 Found ${tables.length} tables to backup:`, tables.join(', '));
        
        const backupData = {
            timestamp: new Date().toISOString(),
            type: 'local_database_backup',
            database_info: {
                host,
                database,
                user
            },
            tables: {}
        };
        
        // 2. Dump data for each table
        for (const table of tables) {
            console.log(`⏳ Dumping table "${table}"...`);
            const res = await pool.query(`SELECT * FROM public."${table}"`);
            backupData.tables[table] = res.rows;
            console.log(`✅ Dumped ${res.rows.length} rows from "${table}".`);
        }
        
        // 3. Write to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `local_db_backup_${timestamp}.json`;
        const backupPath = path.join(process.cwd(), backupFilename);
        
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
        console.log(`\n🎉 Local database backup completed successfully!`);
        console.log(`📁 Saved to: ${backupPath}`);
        
    } catch (err) {
        console.error('❌ Error creating local database backup:', err);
    } finally {
        await pool.end();
    }
}

main();
