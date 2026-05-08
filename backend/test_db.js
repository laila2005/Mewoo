import pkg from 'pg';
const { Client } = pkg;

async function testConnection() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: 'admin', // try a few common ones if needed, or leave blank/postgres
        port: 5432,
    });

    try {
        await client.connect();
        console.log("SUCCESS: Connected to PostgreSQL on your local machine!");
        await client.end();
    } catch (err) {
        console.error("FAILED: Could not connect.", err.message);
    }
}

testConnection();
