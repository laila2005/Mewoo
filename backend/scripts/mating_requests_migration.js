import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = connectionString
  ? new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    })
  : new pg.Pool({
      user: 'postgres',
      password: 'medfylolo',
      host: 'localhost',
      port: 5432,
      database: 'petpulse_db'
    });

async function run() {
    const client = await pool.connect();
    try {
        console.log("⏳ Starting migration...");
        
        // 1. Add gender and location columns to pets if they don't exist
        console.log("⚡ Adding columns to pets table if missing...");
        await client.query(`
            ALTER TABLE pets 
            ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
            ADD COLUMN IF NOT EXISTS location VARCHAR(300);
        `);
        console.log("✅ Added columns to pets table.");

        // 2. Create mating_requests table
        console.log("⚡ Creating mating_requests table if missing...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS mating_requests (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
                applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                applicant_pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
                message TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(pet_id, applicant_pet_id)
            );
        `);
        console.log("✅ mating_requests table verified/created.");
        
        console.log('🎉 Migration executed successfully');
    } catch (e) {
        console.error('❌ Migration failed:', e.message);
        throw e;
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(e => { process.exit(1); });
