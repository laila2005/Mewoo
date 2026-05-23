import pkg from 'pg';
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:medfylolo@localhost:5432/postgres";

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : {
    rejectUnauthorized: false
  }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Robust ID Document Fields Database Migration ---');
    console.log(`🔌 Connecting to database: ${new URL(connectionString).host}`);
    
    const tables = ['vet_profiles', 'trainer_profiles', 'pet_shops', 'shops'];
    
    for (const table of tables) {
      try {
        console.log(`Altering table "${table}"...`);
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS id_document_url VARCHAR(512);`);
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS verification_notes TEXT;`);
        console.log(`✅ Table "${table}" updated successfully!`);
      } catch (err) {
        console.warn(`⚠️ Table "${table}" alter skipped/failed:`, err.message);
      }
    }
    
    console.log('✅ Migration run finished!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
