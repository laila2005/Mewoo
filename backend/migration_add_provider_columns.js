import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    password: 'medfylolo',
    host: 'localhost',
    port: 5432,
    database: 'petpulse_db',
});

async function runMigration() {
    try {
        console.log('Adding cover_url and custom_sections to vet_profiles...');
        await pool.query(`ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS cover_url VARCHAR;`);
        await pool.query(`ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS custom_sections JSONB;`);
        
        console.log('Adding cover_url and custom_sections to trainer_profiles...');
        await pool.query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS cover_url VARCHAR;`);
        await pool.query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS custom_sections JSONB;`);
        
        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Error during migration:', e.message);
    }
    await pool.end();
}

runMigration();
