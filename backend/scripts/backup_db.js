import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL is not set in backend/.env!');
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        console.log('⚡ Starting database backup process...');
        
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
            database_url_host: new URL(connectionString).host,
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
        const backupFilename = `db_backup_${timestamp}.json`;
        const backupPath = path.join(process.cwd(), backupFilename);
        
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
        console.log(`\n🎉 Backup completed successfully!`);
        console.log(`📁 Saved to: ${backupPath}`);
        
    } catch (err) {
        console.error('❌ Error creating backup:', err);
    } finally {
        await pool.end();
    }
}

main();
