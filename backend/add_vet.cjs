const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function run() {
    const client = new Client({
        user: 'postgres',
        password: 'medfylolo',
        host: 'localhost',
        port: 5432,
        database: 'petpulse_db'
    });
    
    try {
        await client.connect();
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password', salt);
        
        const res = await client.query(
            "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            ['lolo.vet@example.com', hash, 'lolo', 'vet', 'vet']
        );
        const id = res.rows[0].id;
        
        await client.query(
            "INSERT INTO vet_profiles (user_id, clinic_name, license_number, status) VALUES ($1, $2, $3, $4)",
            [id, 'Lolo Clinic', 'VET123456', 'approved']
        );
        console.log('Vet account created');
    } catch (e) {
        console.error('DB Error:', e);
    } finally {
        await client.end();
    }
}

run();
