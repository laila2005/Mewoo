import { query } from './src/config/db.js';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
    try {
        console.log("🌱 Starting Database Seeding...");

        // Clear existing data (Careful!)
        console.log("🧹 Clearing old data...");
        await query('DELETE FROM post_comments');
        await query('DELETE FROM post_likes');
        await query('DELETE FROM community_posts');
        await query('DELETE FROM payments');
        await query('DELETE FROM service_bookings');
        await query('DELETE FROM services');
        await query('DELETE FROM appointments');
        await query('DELETE FROM pets');
        await query('DELETE FROM trainer_profiles');
        await query('DELETE FROM vet_profiles');
        await query('DELETE FROM users');

        const salt = await bcrypt.genSalt(10);
        const defaultPassword = await bcrypt.hash('password123', salt);
        const adminPassword = await bcrypt.hash('admin123', salt);

        // ==========================
        // 1. CREATE USERS
        // ==========================
        console.log("👥 Creating users...");

        // Admin
        const adminRes = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            ['admin@petpulse.com', adminPassword, 'System', 'Admin', 'admin']
        );
        const adminId = adminRes.rows[0].id;

        // Vets
        const vet1Res = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            ['sarah.vet@petpulse.com', defaultPassword, 'Sarah', 'Chen', 'vet']
        );
        const vet1Id = vet1Res.rows[0].id;

        const vet2Res = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            ['michael.vet@petpulse.com', defaultPassword, 'Michael', 'Scott', 'vet']
        );
        const vet2Id = vet2Res.rows[0].id;

        // Trainers
        const trainer1Res = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            ['jessica.train@petpulse.com', defaultPassword, 'Jessica', 'Davis', 'trainer']
        );
        const trainer1Id = trainer1Res.rows[0].id;

        // Owners
        const owner1Res = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            ['alex.owner@petpulse.com', defaultPassword, 'Alex', 'Johnson', 'owner']
        );
        const owner1Id = owner1Res.rows[0].id;

        const owner2Res = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            ['emily.owner@petpulse.com', defaultPassword, 'Emily', 'Clark', 'owner']
        );
        const owner2Id = owner2Res.rows[0].id;

        // ==========================
        // 2. CREATE PROFILES (Vets & Trainers)
        // ==========================
        console.log("🏥 Creating provider profiles...");

        await query(
            `INSERT INTO vet_profiles (user_id, clinic_name, license_number, is_emergency, bio, status) VALUES ($1, $2, $3, $4, $5, $6)`,
            [vet1Id, 'Downtown Pet Clinic', 'VET-12345', true, 'Over 10 years of experience in small animal surgery and preventive care.', 'approved']
        );

        await query(
            `INSERT INTO vet_profiles (user_id, clinic_name, license_number, is_emergency, bio, status) VALUES ($1, $2, $3, $4, $5, $6)`,
            [vet2Id, 'Riverside Animal Hospital', 'VET-67890', false, 'Specializing in feline medicine and behavioral consultation.', 'approved']
        );

        await query(
            `INSERT INTO trainer_profiles (user_id, specialties, bio, status) VALUES ($1, $2, $3, $4)`,
            [trainer1Id, ['Puppy Foundations', 'Obedience', 'Behavior Correction'], 'Certified Professional Dog Trainer with a focus on positive reinforcement.', 'approved']
        );

        // ==========================
        // 3. CREATE PETS
        // ==========================
        console.log("🐾 Creating pets...");

        const pet1Res = await query(
            `INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [owner1Id, 'Buddy', 'Dog', 'Golden Retriever', 3, 25.5, 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400']
        );
        const pet1Id = pet1Res.rows[0].id;

        const pet2Res = await query(
            `INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [owner2Id, 'Luna', 'Cat', 'Siamese Mix', 2, 4.2, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400']
        );
        const pet2Id = pet2Res.rows[0].id;

        const pet3Res = await query(
            `INSERT INTO pets (owner_id, name, species, breed, age_years, weight_kg, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [owner1Id, 'Charlie', 'Dog', 'Beagle', 1, 10.0, 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=400']
        );

        // ==========================
        // 4. CREATE COMMUNITY POSTS
        // ==========================
        console.log("📸 Creating community posts...");

        const post1Res = await query(
            `INSERT INTO community_posts (user_id, content, likes_count, image_url) VALUES ($1, $2, $3, $4) RETURNING id`,
            [owner1Id, 'Just had an amazing training session with Jessica! Buddy is learning so fast.', 15, 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&q=80&w=600']
        );

        await query(
            `INSERT INTO community_posts (user_id, content, likes_count, image_url) VALUES ($1, $2, $3, $4)`,
            [vet1Id, 'Reminder to all pet parents: Summer is coming! Keep your pets hydrated and avoid walking them on hot pavement.', 42, 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?auto=format&fit=crop&q=80&w=600']
        );

        await query(
            `INSERT INTO community_posts (user_id, content, likes_count, image_url) VALUES ($1, $2, $3, $4)`,
            [owner2Id, 'Luna is enjoying the weekend vibes 🐈💤', 28, 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?auto=format&fit=crop&q=80&w=600']
        );

        // ==========================
        // 5. CREATE SERVICES & BOOKINGS
        // ==========================
        console.log("📅 Creating services and bookings...");

        const service1Res = await query(
            `INSERT INTO services (provider_id, title, description, category, base_price) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [trainer1Id, 'Puppy Obedience Training (1hr)', 'Basic commands, leash walking, and socialization for puppies under 1 year.', 'training', 60.00]
        );
        const service1Id = service1Res.rows[0].id;

        // Book a service
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(tomorrow.getHours() + 1);

        await query(
            `INSERT INTO service_bookings (client_id, service_id, status, start_time, end_time, total_price) VALUES ($1, $2, $3, $4, $5, $6)`,
            [owner1Id, service1Id, 'requested', tomorrow, tomorrowEnd, 60.00]
        );

        // Book a vet appointment
        await query(
            `INSERT INTO appointments (pet_id, vet_user_id, status, appointment_time, reason) VALUES ($1, $2, $3, $4, $5)`,
            [pet2Id, vet1Id, 'confirmed', tomorrow, 'Annual checkup and vaccination updates.']
        );

        console.log("✅ Seeding completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase();
