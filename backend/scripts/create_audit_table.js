import { query } from '../src/config/db.js';

async function createTable() {
    try {
        console.log("Enabling extensions and creating audit_logs table...");
        await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        const sql = `
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                level VARCHAR(50) NOT NULL,
                user_name VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                action VARCHAR(255) NOT NULL,
                details TEXT
            );
        `;
        await query(sql);
        console.log("audit_logs table created successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Failed to create audit_logs table:", err);
        process.exit(1);
    }
}

createTable();
