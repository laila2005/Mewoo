import bcrypt from 'bcryptjs';
import { query } from './src/config/db.js';

async function createAdmin() {
    try {
        const email = 'admin@petpulse.com';
        const password = 'admin';
        const first_name = 'System';
        const last_name = 'Admin';
        const role = 'admin';

        // Check if admin already exists
        const check = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            console.log('Admin user already exists with email: admin@petpulse.com');
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert admin user
        const insertQuery = `
            INSERT INTO users (email, password_hash, first_name, last_name, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, role;
        `;
        
        const result = await query(insertQuery, [email, password_hash, first_name, last_name, role]);
        console.log('Admin user successfully created:', result.rows[0]);
        process.exit(0);

    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
}

createAdmin();
