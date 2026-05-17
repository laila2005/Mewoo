import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'petpulse_app',
  host: 'localhost',
  database: 'petpulse_db',
  password: 'secure_app_password_2026',
  port: 5432,
});

async function run() {
  try {
    // 1. Find a provider user
    let userRes = await pool.query("SELECT id FROM users WHERE role IN ('vet', 'trainer') LIMIT 1");
    let providerId;
    
    if (userRes.rows.length === 0) {
      console.log("No provider found, creating a dummy provider...");
      const insertUser = await pool.query(`
        INSERT INTO users (first_name, last_name, email, password_hash, role) 
        VALUES ('Dr. Sarah', 'Jenkins', 'sarah.vet@example.com', 'dummyhash', 'vet') 
        RETURNING id
      `);
      providerId = insertUser.rows[0].id;
    } else {
      providerId = userRes.rows[0].id;
    }

    console.log("Using Provider ID:", providerId);

    // 2. Insert dummy services
    const services = [
      {
        provider_id: providerId,
        title: 'Complete Pet Checkup & Wellness Exam',
        description: 'A comprehensive nose-to-tail physical examination to ensure your pet is healthy and happy.',
        category: 'sitting', // Using valid enum
        base_price: 85.00,
        is_active: true
      },
      {
        provider_id: providerId,
        title: 'Professional Pet Grooming & Spa',
        description: 'Full service grooming including bath, haircut, nail trimming, and ear cleaning.',
        category: 'walking', // Using valid enum
        base_price: 65.00,
        is_active: true
      },
      {
        provider_id: providerId,
        title: 'Basic Obedience Training Package',
        description: '6-week training course covering sit, stay, heel, and basic behavioral correction.',
        category: 'training',
        base_price: 150.00,
        is_active: true
      },
      {
        provider_id: providerId,
        title: 'Routine Vaccinations',
        description: 'Annual core vaccines including Rabies, DHPP, and Bordetella.',
        category: 'sitting', // Using valid enum
        base_price: 45.00,
        is_active: true
      },
      {
        provider_id: providerId,
        title: 'Overnight Pet Boarding',
        description: 'Safe and comfortable overnight stay with daily walks and playtime included.',
        category: 'sitting', // Using valid enum
        base_price: 40.00,
        is_active: true
      }
    ];

    for (let s of services) {
      await pool.query(`
        INSERT INTO services (provider_id, title, description, category, base_price, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [s.provider_id, s.title, s.description, s.category, s.base_price, s.is_active]);
    }

    console.log("Successfully seeded 5 services!");
  } catch (err) {
    console.error("Seeding Error:", err);
  } finally {
    pool.end();
  }
}

run();
