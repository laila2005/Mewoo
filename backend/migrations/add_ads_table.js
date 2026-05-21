import { query } from '../src/config/db.js';

async function migrate() {
    try {
        console.log('🚀 Starting ad_banners table migration...');
        
        await query(`
            CREATE TABLE IF NOT EXISTS ad_banners (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                image_url VARCHAR(500) NOT NULL,
                target_url VARCHAR(500) NOT NULL,
                placement VARCHAR(100) NOT NULL,
                duration VARCHAR(100) NOT NULL,
                price NUMERIC NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                payment_status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        
        console.log('✅ ad_banners table created/verified successfully!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    }
}

migrate();
