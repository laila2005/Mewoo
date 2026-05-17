import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';

async function seed() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'petpulse_db',
        password: 'medfylolo',
        port: 5432,
    });

    try {
        await client.connect();
        console.log("Connected to petpulse_db.");

        // Clear existing Vets and their profiles
        await client.query("DELETE FROM appointments");
        await client.query("DELETE FROM provider_reviews");
        await client.query("DELETE FROM vet_profiles");
        await client.query("DELETE FROM users WHERE role = 'vet'");

        const password_hash = await bcrypt.hash('password123', 10);

        // Vets Data
        const vets = [
            { 
                first_name: 'Sarah', 
                last_name: 'Mitchell', 
                email: 'sarah.vet@example.com', 
                lat: 30.0444, lng: 31.2357, 
                clinic: 'Cairo Central Pet Hospital',
                license: 'VET-1001',
                emergency: true,
                profile_pic_url: 'https://images.unsplash.com/photo-1594824432258-297eb0cc2eb8?auto=format&fit=crop&q=80&w=300',
                bio: 'Specialist in emergency care and complex surgeries. Available 24/7 for urgent cases.' 
            },
            { 
                first_name: 'David', 
                last_name: 'Chen', 
                email: 'david.vet@example.com', 
                lat: 30.0500, lng: 31.2400, 
                clinic: 'Downtown Paws Clinic',
                license: 'VET-1002',
                emergency: false,
                profile_pic_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300',
                bio: 'General practice focusing on preventive medicine and routine checkups.' 
            },
            { 
                first_name: 'Elena', 
                last_name: 'Rodriguez', 
                email: 'elena.vet@example.com', 
                lat: 30.0600, lng: 31.2500, 
                clinic: 'Feline Friends Care Center',
                license: 'VET-1003',
                emergency: true,
                profile_pic_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
                bio: 'Dedicated exclusively to feline health and behavior. Certified Cat Friendly Practice.' 
            },
            { 
                first_name: 'Omar', 
                last_name: 'Tariq', 
                email: 'omar.vet@example.com', 
                lat: 30.0300, lng: 31.2200, 
                clinic: 'Exotic Pet Specialists',
                license: 'VET-1004',
                emergency: false,
                profile_pic_url: null,
                bio: 'Expert care for birds, reptiles, and small mammals.' 
            }
        ];

        for (const vet of vets) {
            const userRes = await client.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, role, latitude, longitude, profile_pic_url)
                VALUES ($1, $2, $3, $4, 'vet', $5, $6, $7) RETURNING id
            `, [vet.email, password_hash, vet.first_name, vet.last_name, vet.lat, vet.lng, vet.profile_pic_url]);
            const userId = userRes.rows[0].id;

            await client.query(`
                INSERT INTO vet_profiles (user_id, clinic_name, license_number, is_emergency, bio, status)
                VALUES ($1, $2, $3, $4, $5, 'approved')
            `, [userId, vet.clinic, vet.license, vet.emergency, vet.bio]);
        }
        console.log("Seeded Vets successfully!");

        // Clear existing pets that are marked for adoption or mating
        await client.query("DELETE FROM pets WHERE is_adoptable = true OR is_mating = true");
        
        // Find or create a dummy owner for these pets
        let ownerRes = await client.query("SELECT id FROM users WHERE email = 'dummy.owner@example.com'");
        if (ownerRes.rows.length === 0) {
            ownerRes = await client.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, role)
                VALUES ($1, $2, 'Dummy', 'Owner', 'owner') RETURNING id
            `, ['dummy.owner@example.com', password_hash]);
        }
        const dummyOwnerId = ownerRes.rows[0].id;

        // Pets Data
        const pets = [
            // Adoptable
            { name: 'Luna', species: 'Cat', breed: 'Siamese Mix', age: 2, is_adoptable: true, is_mating: false, avatar: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=300' },
            { name: 'Max', species: 'Dog', breed: 'Golden Retriever Mix', age: 4, is_adoptable: true, is_mating: false, avatar: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=300' },
            { name: 'Bella', species: 'Cat', breed: 'Domestic Shorthair', age: 1, is_adoptable: true, is_mating: false, avatar: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=300' },
            { name: 'Charlie', species: 'Dog', breed: 'Beagle', age: 3, is_adoptable: true, is_mating: false, avatar: 'https://images.unsplash.com/photo-1537151608804-ea2f1fa3dfc5?auto=format&fit=crop&q=80&w=300' },
            // Mating
            { name: 'Rocky', species: 'Dog', breed: 'German Shepherd', age: 3, is_adoptable: false, is_mating: true, avatar: 'https://images.unsplash.com/photo-1589965716319-4a041b58fa8a?auto=format&fit=crop&q=80&w=300' },
            { name: 'Daisy', species: 'Dog', breed: 'French Bulldog', age: 2, is_adoptable: false, is_mating: true, avatar: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=300' },
            { name: 'Simba', species: 'Cat', breed: 'Maine Coon', age: 4, is_adoptable: false, is_mating: true, avatar: 'https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&q=80&w=300' },
            { name: 'Milo', species: 'Cat', breed: 'Persian', age: 3, is_adoptable: false, is_mating: true, avatar: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=300' }
        ];

        for (const pet of pets) {
            await client.query(`
                INSERT INTO pets (owner_id, name, species, breed, age_years, is_adoptable, is_mating, avatar_url)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [dummyOwnerId, pet.name, pet.species, pet.breed, pet.age, pet.is_adoptable, pet.is_mating, pet.avatar]);
        }
        console.log("Seeded Pets successfully!");

        await client.end();
    } catch (err) {
        console.error("Error seeding:", err);
    }
}

seed();
