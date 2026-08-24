import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  password: 'medfylolo',
  host: 'localhost',
  port: 5432,
  database: 'petpluse_db',
});

const query = (text, params) => pool.query(text, params);

async function runMigration() {
    try {
        console.log('🚀 Starting AI Triage Database Migration (Superuser Mode)...');

        // 1. Ensure uuid-ossp extension is enabled
        console.log('🔗 Ensuring uuid-ossp extension is active...');
        await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

        // 2. Create the ai_triages table
        console.log('📋 Creating ai_triages table...');
        await query(`
            CREATE TABLE IF NOT EXISTS ai_triages (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
                symptoms TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Grant privileges to petpluse_app
        console.log('🔑 Granting permissions to petpluse_app user...');
        await query(`GRANT ALL PRIVILEGES ON TABLE ai_triages TO petpluse_app;`);

        console.log('✅ AI Triage database migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
