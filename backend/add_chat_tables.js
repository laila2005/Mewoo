import pkg from 'pg';
const { Client } = pkg;

async function migrate() {
    const client = new Client({
        user: 'postgres',
        password: 'medfylolo',
        host: 'localhost',
        port: 5432,
        database: 'petpulse_db'
    });

    try {
        await client.connect();
        const sql = `
            DO $$ BEGIN
                CREATE TYPE chat_request_status AS ENUM ('pending', 'accepted', 'rejected');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;

            CREATE TABLE IF NOT EXISTS chat_requests (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
                status chat_request_status DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(sender_id, receiver_id, pet_id)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            GRANT SELECT, INSERT, UPDATE, DELETE ON chat_requests TO petpulse_app;
            GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO petpulse_app;
        `;
        
        await client.query(sql);
        console.log('Chat tables created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
