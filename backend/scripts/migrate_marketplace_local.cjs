const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:medfylolo@localhost:5432/postgres"
});

async function run() {
    try {
        await client.connect();
        console.log('--- Starting Local Marketplace Enhancements Migration ---');
        
        console.log('Altering marketplace_products table...');
        await client.query('ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 10;');
        await client.query('ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT \'[]\'::jsonb;');
        console.log('✅ Columns verified/added.');

        console.log('Creating marketplace_product_reviews table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS marketplace_product_reviews (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id VARCHAR REFERENCES marketplace_products(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                vendor_reply TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ marketplace_product_reviews table verified/created.');
        
        console.log('✅ Local migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

run();
