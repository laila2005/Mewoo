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
    // 1. Find or create an owner user
    let userRes = await pool.query("SELECT id FROM users WHERE role = 'owner' LIMIT 1");
    let ownerId;
    
    if (userRes.rows.length === 0) {
      console.log("No owner found, creating a dummy owner...");
      const insertUser = await pool.query(`
        INSERT INTO users (first_name, last_name, email, password_hash, role) 
        VALUES ('Adoption', 'Center', 'adopt@petpulse.com', 'dummyhash', 'owner') 
        RETURNING id
      `);
      ownerId = insertUser.rows[0].id;
    } else {
      ownerId = userRes.rows[0].id;
    }

    console.log("Using Owner ID:", ownerId);

    // 2. Insert pets with real photos
    const pets = [
      {
        owner_id: ownerId,
        name: 'Milo',
        species: 'Dog',
        breed: 'Mixed',
        age_years: 2,
        weight_kg: 15,
        avatar_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&auto=format&fit=crop&q=60',
        is_adoptable: true,
        is_mating: false
      },
      {
        owner_id: ownerId,
        name: 'Luna',
        species: 'Cat',
        breed: 'Tuxedo',
        age_years: 1,
        weight_kg: 4,
        avatar_url: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=500&auto=format&fit=crop&q=60',
        is_adoptable: true,
        is_mating: false
      },
      {
        owner_id: ownerId,
        name: 'Charlie',
        species: 'Dog',
        breed: 'Beagle',
        age_years: 3,
        weight_kg: 10,
        avatar_url: 'https://images.unsplash.com/photo-1537151608804-ea6f117c7608?w=500&auto=format&fit=crop&q=60',
        is_adoptable: true,
        is_mating: false
      },
      {
        owner_id: ownerId,
        name: 'Bella',
        species: 'Cat',
        breed: 'Domestic Shorthair',
        age_years: 1,
        weight_kg: 3,
        avatar_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&auto=format&fit=crop&q=60',
        is_adoptable: true,
        is_mating: false
      },
      {
        owner_id: ownerId,
        name: 'Max',
        species: 'Dog',
        breed: 'Golden Retriever',
        age_years: 4,
        weight_kg: 30,
        avatar_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&auto=format&fit=crop&q=60',
        is_adoptable: true,
        is_mating: false
      },
      {
        owner_id: ownerId,
        name: 'Simba',
        species: 'Cat',
        breed: 'Maine Coon',
        age_years: 4,
        weight_kg: 8,
        avatar_url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=500&auto=format&fit=crop&q=60',
        is_adoptable: false,
        is_mating: true
      }
    ];

    for (let p of pets) {
      await pool.query(`
        INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, avatar_url, is_adoptable, is_mating)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [p.owner_id, p.name, p.species, p.breed, p.age_years, p.weight_kg, p.avatar_url, p.is_adoptable, p.is_mating]);
    }

    console.log("Successfully seeded pets with real photos!");
  } catch (err) {
    console.error("Seeding Error:", err);
  } finally {
    pool.end();
  }
}

run();
