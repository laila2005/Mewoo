const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateHosting() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Creating host_profiles table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS host_profiles (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                is_available BOOLEAN DEFAULT false,
                hourly_rate NUMERIC,
                daily_rate NUMERIC,
                bio TEXT,
                accepted_pets TEXT[],
                max_pets INTEGER DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Creating host_bookings table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS host_bookings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                host_id UUID REFERENCES users(id) ON DELETE CASCADE,
                pet_owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
                pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
                start_date TIMESTAMP WITH TIME ZONE NOT NULL,
                end_date TIMESTAMP WITH TIME ZONE NOT NULL,
                total_price NUMERIC NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Creating host_reviews table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS host_reviews (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                host_id UUID REFERENCES users(id) ON DELETE CASCADE,
                reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('COMMIT');
        console.log("Migration successful.");
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateHosting();
