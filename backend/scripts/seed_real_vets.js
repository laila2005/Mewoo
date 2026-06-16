import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const client = await pool.connect();
    try {
        console.log("Starting real vets seeding...");

        const salt = await bcrypt.genSalt(10);
        const defaultPasswordHash = await bcrypt.hash('admin', salt);

        // Vets array to seed/update
        const vetsToSeed = [
            {
                email: "cypress.vet@petpulse.com",
                first_name: "Dr. Tarek",
                last_name: "Abdel-Aziz",
                phone: "+20 100 888 9900",
                profile_pic_url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300",
                latitude: 30.0630,
                longitude: 31.2200, // Zamalek
                clinic_name: "Cypress Veterinary Clinic & Orthopedics",
                license_number: "VET-CYP-9988",
                is_emergency: false,
                bio: "Dr. Tarek is a dedicated orthopedic surgeon with 15+ years of experience in advanced pet surgeries, spinal therapy, and joint reconstruction.",
                consultation_fee: 600.00,
                specialties: ["Surgery", "Orthopedics", "General Medicine"],
                address: "26 July St, Zamalek, Cairo"
            },
            {
                email: "sarah.vet@petpulse.com",
                first_name: "Dr. Sarah",
                last_name: "Chen",
                phone: "+20 122 456 7890",
                profile_pic_url: "https://images.unsplash.com/photo-1594824432258-297eb0cc2eb8?auto=format&fit=crop&q=80&w=300",
                latitude: 30.0444,
                longitude: 31.2357, // Downtown
                clinic_name: "Downtown Pet Clinic",
                license_number: "VET-12345",
                is_emergency: true,
                bio: "Dr. Sarah has over 10 years of experience in small animal internal medicine, feline care, and preventive health.",
                consultation_fee: 500.00,
                specialties: ["Feline Medicine", "Preventive Care", "Internal Medicine"],
                address: "Tahrir Square, Downtown Cairo"
            },
            {
                email: "amina.mansour@petpulse.com",
                first_name: "Dr. Amina",
                last_name: "Mansour",
                phone: "+20 111 234 5678",
                profile_pic_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
                latitude: 29.9602,
                longitude: 31.2569, // Maadi
                clinic_name: "Maadi Pet Wellness Center",
                license_number: "VET-AMI-5566",
                is_emergency: false,
                bio: "Dr. Amina specializes in canine nutrition, wellness checkups, and senior pet care.",
                consultation_fee: 450.00,
                specialties: ["Canine Nutrition", "Wellness Checkups", "Senior Pet Care"],
                address: "Road 9, Maadi, Cairo"
            },
            {
                email: "sherif.hegazi@petpulse.com",
                first_name: "Dr. Sherif",
                last_name: "Hegazi",
                phone: "+20 102 345 6789",
                profile_pic_url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300",
                latitude: 30.0910,
                longitude: 31.3220, // Heliopolis
                clinic_name: "Heliopolis Animal Hospital",
                license_number: "VET-SHE-8822",
                is_emergency: true,
                bio: "Dr. Sherif is a specialist in emergency critical care, trauma treatment, and avian medicine.",
                consultation_fee: 700.00,
                specialties: ["Emergency Care", "Trauma", "Avian Medicine"],
                address: "El-Bostan St, Heliopolis, Cairo"
            },
            {
                email: "yasmine.sabri@petpulse.com",
                first_name: "Dr. Yasmine",
                last_name: "Sabri",
                phone: "+20 106 789 0123",
                profile_pic_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=300",
                latitude: 30.0200,
                longitude: 31.4900, // New Cairo
                clinic_name: "New Cairo Veterinary Specialty Clinic",
                license_number: "VET-YAS-4477",
                is_emergency: false,
                bio: "Dr. Yasmine is an exotic pet expert specializing in reptiles, birds, and pocket pets.",
                consultation_fee: 550.00,
                specialties: ["Exotics", "Reptiles", "Avian Care"],
                address: "North 90th St, New Cairo"
            }
        ];

        for (const vet of vetsToSeed) {
            // Check if user exists
            const userCheck = await client.query("SELECT id FROM users WHERE email = $1", [vet.email]);
            let userId;

            if (userCheck.rows.length > 0) {
                userId = userCheck.rows[0].id;
                console.log(`Updating existing vet user: ${vet.email} (ID: ${userId})`);
                await client.query(`
                    UPDATE users 
                    SET first_name = $1, last_name = $2, phone = $3, profile_pic_url = $4, latitude = $5, longitude = $6, role = 'vet'
                    WHERE id = $7
                `, [vet.first_name, vet.last_name, vet.phone, vet.profile_pic_url, vet.latitude, vet.longitude, userId]);
            } else {
                console.log(`Creating new vet user: ${vet.email}`);
                const userInsert = await client.query(`
                    INSERT INTO users (email, password_hash, first_name, last_name, phone, profile_pic_url, latitude, longitude, role)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'vet')
                    RETURNING id
                `, [vet.email, defaultPasswordHash, vet.first_name, vet.last_name, vet.phone, vet.profile_pic_url, vet.latitude, vet.longitude]);
                userId = userInsert.rows[0].id;
            }

            // Check if vet profile exists
            const profileCheck = await client.query("SELECT * FROM vet_profiles WHERE user_id = $1", [userId]);
            if (profileCheck.rows.length > 0) {
                console.log(`Updating existing vet profile for user: ${userId}`);
                await client.query(`
                    UPDATE vet_profiles
                    SET clinic_name = $1, license_number = $2, is_emergency = $3, bio = $4, status = 'approved',
                        consultation_fee = $5, specialties = $6, address = $7
                    WHERE user_id = $8
                `, [vet.clinic_name, vet.license_number, vet.is_emergency, vet.bio, vet.consultation_fee, vet.specialties, vet.address, userId]);
            } else {
                console.log(`Creating new vet profile for user: ${userId}`);
                await client.query(`
                    INSERT INTO vet_profiles (user_id, clinic_name, license_number, is_emergency, bio, status, consultation_fee, specialties, address)
                    VALUES ($1, $2, $3, $4, $5, 'approved', $6, $7, $8)
                `, [userId, vet.clinic_name, vet.license_number, vet.is_emergency, vet.bio, vet.consultation_fee, vet.specialties, vet.address]);
            }
        }

        console.log("Seeding real vets completed successfully!");
    } catch (err) {
        console.error("Failed to seed real vets:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
