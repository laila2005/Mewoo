import pg from 'pg';

const pool = new pg.Pool({
    user: 'postgres',
    password: 'medfylolo',
    host: 'localhost',
    port: 5432,
    database: 'petpluse_db'
});

async function migrate() {
    console.log('--- Starting User Location Table Migration ---');
    try {
        const client = await pool.connect();
        
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);
        `);
        console.log('✅ Geolocation columns (latitude, longitude, neighborhood) added to users successfully!');
        
        // Let's verify the updated columns
        const colCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name IN ('latitude', 'longitude', 'neighborhood');
        `);
        console.log('Verified Location Schema Columns:');
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
