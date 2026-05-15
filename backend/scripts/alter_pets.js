import pkg from 'pg';
const { Client } = pkg;

async function alterPets() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'petpulse_db',
        password: 'medfylolo',
        port: 5432,
    });

    try {
        await client.connect();
        
        // Add columns if they don't exist
        await client.query(`
            ALTER TABLE pets 
            ADD COLUMN IF NOT EXISTS is_adoptable BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS is_mating BOOLEAN DEFAULT FALSE;
        `);
        console.log("Altered pets table.");
        
        await client.end();
    } catch (err) {
        console.error("Error:", err);
    }
}
alterPets();
