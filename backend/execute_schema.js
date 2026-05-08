import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;

async function run() {
    const defaultClient = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: 'medfylolo',
        port: 5432,
    });

    try {
        await defaultClient.connect();
        console.log("Connected to default postgres DB.");
        
        // Create database if not exists
        const res = await defaultClient.query("SELECT 1 FROM pg_database WHERE datname = 'petpulse_db'");
        if (res.rowCount === 0) {
            console.log("Creating database petpulse_db...");
            await defaultClient.query("CREATE DATABASE petpulse_db");
        } else {
            console.log("Database petpulse_db already exists.");
        }
        await defaultClient.end();

        // Now connect to petpulse_db and run schema
        const petPulseClient = new Client({
            user: 'postgres',
            host: 'localhost',
            database: 'petpulse_db',
            password: 'medfylolo',
            port: 5432,
        });

        await petPulseClient.connect();
        console.log("Connected to petpulse_db.");

        const schemaPath = path.resolve('../docs/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log("Executing schema.sql...");
        await petPulseClient.query(schemaSql);
        
        console.log("Schema successfully executed!");
        await petPulseClient.end();
    } catch (err) {
        console.error("Error executing schema:", err);
    }
}

run();
