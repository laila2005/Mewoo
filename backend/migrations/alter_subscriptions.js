import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  password: 'medfylolo',
  host: 'localhost',
  port: 5432,
  database: 'petpulse_db',
});

const query = (text, params) => pool.query(text, params);

async function runMigration() {
    try {
        console.log('Starting Monetization Database Migration...');

        // 1. Create user_subscriptions table
        console.log('Creating user_subscriptions table...');
        await query(`
            CREATE TABLE IF NOT EXISTS user_subscriptions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                plan_id VARCHAR NOT NULL,
                plan_name VARCHAR NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'active',
                price NUMERIC NOT NULL,
                next_billing_date TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('user_subscriptions table created or already exists.');

        // 2. Add order_details to payments table
        console.log('Adding order_details column to payments table...');
        await query(`
            ALTER TABLE payments 
            ADD COLUMN IF NOT EXISTS order_details JSONB;
        `);
        console.log('order_details column added or already exists.');

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
