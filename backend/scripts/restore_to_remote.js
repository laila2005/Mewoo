import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Use the remote DATABASE_URL (Supabase)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL is not set in backend/.env!');
    process.exit(1);
}

console.log(`🔌 Connecting to remote database: ${new URL(connectionString).host}`);

const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

// Tables in DELETION order (children first, parents last) to respect foreign keys
const DELETE_ORDER = [
    'post_comments',
    'post_likes',
    'comment_reactions',
    'community_post_comments',
    'provider_reviews',
    'ai_triages',
    'ai_booking_sessions',
    'notifications',
    'messages',
    'chat_requests',
    'payments',
    'user_subscriptions',
    'service_bookings',
    'services',
    'appointments',
    'community_posts',
    'lost_pets',
    'found_reports',
    'pets',
    'trainer_profiles',
    'vet_profiles',
    'marketplace_products',
    'subscription_plans',
    'users',
];

// Tables in INSERTION order (parents first, children last) to respect foreign keys
const INSERT_ORDER = [
    'users',
    'vet_profiles',
    'trainer_profiles',
    'pets',
    'subscription_plans',
    'marketplace_products',
    'services',
    'appointments',
    'service_bookings',
    'community_posts',
    'lost_pets',
    'found_reports',
    'post_comments',
    'post_likes',
    'provider_reviews',
    'notifications',
    'chat_requests',
    'messages',
    'ai_booking_sessions',
    'ai_triages',
    'payments',
    'user_subscriptions',
];

async function main() {
    const client = await pool.connect();
    
    try {
        // 1. Read the backup file
        const backupPath = 'local_db_backup_2026-05-20T09-22-19-850Z.json';
        console.log(`📂 Reading backup file: ${backupPath}`);
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        console.log(`✅ Backup loaded (${Object.keys(backupData.tables).length} tables)`);
        
        // 2. Check remote schema - get existing tables
        const tablesRes = await client.query(
            `SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
        );
        const remoteTables = tablesRes.rows.map(r => r.table_name);
        console.log(`📋 Remote tables: ${remoteTables.join(', ')}`);
        
        // 3. Begin transaction
        await client.query('BEGIN');
        console.log('\n🔄 Starting restore transaction...\n');
        
        // 4. Temporarily drop foreign key constraints
        console.log('⚙️  Deferring all constraints...');
        await client.query('SET CONSTRAINTS ALL DEFERRED');
        
        // 5. Delete existing data in proper order
        console.log('\n🧹 Clearing existing remote data...');
        for (const table of DELETE_ORDER) {
            if (remoteTables.includes(table)) {
                try {
                    const delRes = await client.query(`DELETE FROM public."${table}"`);
                    console.log(`   🗑️  Deleted ${delRes.rowCount} rows from "${table}"`);
                } catch (delErr) {
                    console.log(`   ⚠️  Could not delete from "${table}": ${delErr.message}`);
                }
            }
        }
        
        // 6. Insert data from backup in correct order
        console.log('\n📥 Inserting backup data into remote database...');
        let totalInserted = 0;
        
        for (const table of INSERT_ORDER) {
            const rows = backupData.tables[table];
            if (!rows || rows.length === 0) {
                console.log(`   ⏭️  Skipping "${table}" (0 rows)`);
                continue;
            }
            
            if (!remoteTables.includes(table)) {
                console.log(`   ⚠️  Table "${table}" does not exist on remote — skipping`);
                continue;
            }
            
            // Get column info from remote to ensure we only insert matching columns
            const colRes = await client.query(
                `SELECT column_name FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = $1
                 ORDER BY ordinal_position`, [table]
            );
            const remoteColumns = colRes.rows.map(r => r.column_name);
            
            // Use columns that exist both in backup data and remote schema
            const backupColumns = Object.keys(rows[0]);
            const validColumns = backupColumns.filter(c => remoteColumns.includes(c));
            
            if (validColumns.length === 0) {
                console.log(`   ⚠️  No matching columns for "${table}" — skipping`);
                continue;
            }
            
            // Build parameterized INSERT for each row
            let insertedCount = 0;
            for (const row of rows) {
                const values = validColumns.map(c => {
                    const val = row[c];
                    // Handle JSON arrays/objects
                    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                        return JSON.stringify(val);
                    }
                    if (Array.isArray(val)) {
                        // If items are objects, it's JSONB
                        if (val.length > 0 && typeof val[0] === 'object') {
                            return JSON.stringify(val);
                        }
                        // For text arrays like specialties
                        return val;
                    }
                    return val;
                });
                
                const placeholders = validColumns.map((_, i) => `$${i + 1}`).join(', ');
                const columnsList = validColumns.map(c => `"${c}"`).join(', ');
                
                try {
                    await client.query(
                        `INSERT INTO public."${table}" (${columnsList}) VALUES (${placeholders})
                         ON CONFLICT DO NOTHING`,
                        values
                    );
                    insertedCount++;
                } catch (insertErr) {
                    console.error(`   ❌ Error inserting into "${table}":`, insertErr.message);
                    console.error(`      Row ID:`, row.id || row.user_id || 'unknown');
                }
            }
            
            console.log(`   ✅ Inserted ${insertedCount}/${rows.length} rows into "${table}"`);
            totalInserted += insertedCount;
        }
        
        // 7. Commit transaction
        await client.query('COMMIT');
        console.log(`\n🎉 Restore completed successfully! Total rows inserted: ${totalInserted}`);
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error during restore — transaction rolled back:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
