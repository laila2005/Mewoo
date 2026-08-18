import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;

// F-10: the production connection string was hard-coded here in clear text,
// committed to a public repository, and it carried the postgres SUPER-USER
// role. It is now read from the environment like every other secret, and the
// script refuses to run rather than falling back to anything embedded.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Copy backend/.env.example to .env and set it.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Remote Database Migration ---');
    
    // 1. Extensions
    console.log('Enabling extensions...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    
    // 2. Alter users table
    console.log('Altering users table...');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);');
    
    // 3. Alter vet_profiles table
    console.log('Altering vet_profiles table...');
    await client.query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS title VARCHAR(255);');
    await client.query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;');
    await client.query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS specialties TEXT[];');
    await client.query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS degrees TEXT;');
    await client.query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC DEFAULT 0;');
    await client.query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS address VARCHAR(255);');
    await client.query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS available_days TEXT[];');
    await client.query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT \'{"start": "09:00", "end": "18:00"}\'::jsonb;');
    
    // 4. Alter trainer_profiles table
    console.log('Altering trainer_profiles table...');
    await client.query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS title VARCHAR(255);');
    await client.query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;');
    await client.query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS degrees TEXT;');
    await client.query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC DEFAULT 0;');
    await client.query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS address VARCHAR(255);');
    await client.query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS available_days TEXT[];');
    await client.query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT \'{"start": "09:00", "end": "18:00"}\'::jsonb;');
    await client.query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);');
    
    // 5. Alter adoption_applications table
    console.log('Altering adoption_applications table...');
    await client.query('ALTER TABLE adoption_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;');
    
    // 6. Create audit_logs table
    console.log('Creating audit_logs table...');
    const createAuditLogsSql = `
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
    await client.query(createAuditLogsSql);
    
    // 7. Seed audit_logs if empty
    console.log('Checking if audit_logs needs seeding...');
    const countRes = await client.query('SELECT COUNT(*) FROM audit_logs');
    const count = parseInt(countRes.rows[0].count, 10);
    if (count === 0) {
        console.log('Seeding initial audit logs...');
        const seedLogs = [
            ['info', 'Alex Johnson', 'owner', 'Published a new community post', 'Buddy is learning so fast under Jessica Davis!'],
            ['warning', 'Dr. Sarah Chen', 'vet', 'Flagged vet triage emergency', 'Flagged cardiovascular and breathing symptoms for Milo.'],
            ['info', 'Jessica Davis', 'trainer', 'Updated specialties in profile builder', 'Added Puppy Foundations and positive reinforcement methodologies.'],
            ['danger', 'Dave Smith', 'owner', 'Account banned by Admin', 'Reason: Spamming promotional links in Egyptian community feed.'],
            ['success', 'Paws & Claws Store', 'vendor', 'Processed ad campaign payment', 'Simulated payment of 500 EGP successfully processed for Home Banner.'],
            ['info', 'Emily Clark', 'owner', 'Registered a new pet profile', 'Added Luna (Cat - Siamese Mix, 6 months old).'],
            ['info', 'Ahmed Ali', 'owner', 'Submitted product review', '5 stars for Premium Leather Dog Collar: "Excellent quality!"'],
            ['info', 'Dr. Michael Scott', 'vet', 'Updated clinic location details', 'Updated clinic address: 12 El Nasr Rd, Maadi, Cairo.'],
            ['warning', 'Dave Smith', 'owner', 'Flagged 3 failed login attempts', 'IP address 197.34.88.21 triggered rate limit warning.'],
            ['info', 'Paws & Claws Store', 'vendor', 'Registered new business storefront', 'Established Maadi store with tax ID TAX-123456.'],
            ['info', 'Alex Johnson', 'owner', 'Booked veterinary appointment', 'Scheduled annual vaccination booster slot with Dr. Sarah Chen.'],
            ['info', 'Emily Clark', 'owner', 'Submitted pet adoption request', 'Applied for Golden Retriever adoption (Milo).'],
            ['success', 'Dr. Sarah Chen', 'vet', 'Marked appointment completed', 'Successfully finalized appointment #b1 and uploaded clinical charts.'],
            ['info', 'System Cron', 'admin', 'Database backup completed', 'Automated offsite backup serialized successfully.']
        ];
        
        for (const log of seedLogs) {
            await client.query(
                `INSERT INTO audit_logs (level, user_name, role, action, details)
                 VALUES ($1, $2, $3, $4, $5)`,
                log
            );
        }
        console.log('Seeded audit logs successfully.');
    } else {
        console.log(`audit_logs already has ${count} records.`);
    }
    
    console.log('✅ Remote Database Migration Completed Successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
