import pkg from 'pg';
const { Client } = pkg;

async function runMigration() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'petpulse_db',
        password: 'medfylolo',
        port: 5432,
    });

    try {
        await client.connect();
        
        console.log("Adding column 'bio' to 'pets' table...");
        await client.query(`
            ALTER TABLE pets 
            ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
        `);
        console.log("✅ Column 'bio' added successfully.");
        
        await client.end();
    } catch (err) {
        console.error("❌ Migration error:", err.message);
        process.exit(1);
    }
}
runMigration();
