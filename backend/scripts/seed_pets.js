import pkg from 'pg';
const { Client } = pkg;

async function seedPets() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'petpulse_db',
        password: 'medfylolo',
        port: 5432,
    });

    try {
        await client.connect();
        
        // Find an owner_id to assign these pets to. (Get the first available user)
        const userRes = await client.query(`SELECT id FROM users LIMIT 1`);
        if (userRes.rows.length === 0) {
            console.log("No users found to assign pets to.");
            return;
        }
        const ownerId = userRes.rows[0].id;

        // Clear existing pets
        await client.query("DELETE FROM pets WHERE is_adoptable = TRUE OR is_mating = TRUE");

        // Adoptable pets
        const adoptablePets = [
            { name: 'Buddy', species: 'Dog', breed: 'Beagle', age: 2, weight: 10.5, avatar: 'https://images.unsplash.com/photo-1537151608804-ea6d15a29ca7?auto=format&fit=crop&q=80&w=300' },
            { name: 'Luna', species: 'Cat', breed: 'Domestic Longhair', age: 1, weight: 4.2, avatar: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=300' }
        ];

        for (const pet of adoptablePets) {
            await client.query(`
                INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, avatar_url, is_adoptable)
                VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
            `, [ownerId, pet.name, pet.species, pet.breed, pet.age, pet.weight, pet.avatar]);
        }

        // Mating pets
        const matingPets = [
            { name: 'Zeus', species: 'Dog', breed: 'Siberian Husky', age: 3, weight: 25.0, avatar: 'https://images.unsplash.com/photo-1605568420105-eb2ea228b231?auto=format&fit=crop&q=80&w=300' },
            { name: 'Misty', species: 'Cat', breed: 'Persian', age: 2, weight: 4.5, avatar: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?auto=format&fit=crop&q=80&w=300' }
        ];

        for (const pet of matingPets) {
            await client.query(`
                INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, avatar_url, is_mating)
                VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
            `, [ownerId, pet.name, pet.species, pet.breed, pet.age, pet.weight, pet.avatar]);
        }

        console.log("Seeded pets successfully.");
        await client.end();
    } catch (err) {
        console.error("Error:", err);
    }
}
seedPets();
