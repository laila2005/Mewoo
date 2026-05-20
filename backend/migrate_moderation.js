import pg from 'pg';

const pool = new pg.Pool({
    user: 'postgres',
    password: 'medfylolo',
    host: 'localhost',
    port: 5432,
    database: 'petpulse_db'
});

async function migrate() {
    console.log('--- Starting database migration with postgres admin user ---');
    try {
        const client = await pool.connect();
        
        await client.query(`
            ALTER TABLE community_posts 
            ADD COLUMN IF NOT EXISTS is_soft_deleted BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS soft_deleted_reason TEXT,
            ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
            ADD COLUMN IF NOT EXISTS review_requested BOOLEAN DEFAULT false;
        `);
        console.log('✅ Moderation columns added to community_posts successfully!');
        
        // Let's verify the updated columns
        const colCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'community_posts';
        `);
        console.log('Current schema columns:');
        console.log(colCheck.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
        
        client.release();
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
