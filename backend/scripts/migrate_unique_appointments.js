import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isLocal = connectionString ? (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) : true;

const pool = connectionString
  ? new pg.Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false }
    })
  : new pg.Pool({
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'medfylolo',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'petpulse_db'
    });

async function migrateUniqueAppointments() {
  const client = await pool.connect();
  try {
    console.log("⏳ Running unique appointments constraint migration...");

    console.log("⚡ Adding UNIQUE constraint (unique_vet_appointment) to appointments table...");
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'unique_vet_appointment'
        ) THEN
          ALTER TABLE appointments 
          ADD CONSTRAINT unique_vet_appointment 
          UNIQUE (vet_user_id, appointment_time);
        END IF;
      END $$;
    `);

    console.log("✅ Migration completed successfully: unique_vet_appointment constraint verified/added.");
  } catch (error) {
    if (error.code === '42710' || (error.message && error.message.includes('already exists'))) {
      console.log("ℹ️ Constraint unique_vet_appointment already exists. Skipping.");
      console.log("✅ Migration completed successfully.");
    } else {
      console.error("❌ Error applying unique_vet_appointment migration:", error);
      process.exitCode = 1;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrateUniqueAppointments();
