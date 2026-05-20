import { query } from './src/config/db.js';

async function migrate() {
    try {
        console.log('Altering user_role ENUM...');
        try {
            await query("ALTER TYPE user_role ADD VALUE 'vendor'");
            console.log('Added vendor to user_role');
        } catch (e) {
            if (e.code === '42710') {
                console.log('vendor role already exists');
            } else {
                throw e;
            }
        }

        console.log('Altering pet_shops table...');
        await query(`
            ALTER TABLE pet_shops
            ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS tax_id VARCHAR(255)
        `);
        console.log('pet_shops altered successfully');
        
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();
