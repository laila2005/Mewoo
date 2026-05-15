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

        // Clear existing hardcoded ones if any (we can clear all vets/trainers or just TRUNCATE)
        await client.query("DELETE FROM vet_profiles");
        await client.query("DELETE FROM trainer_profiles");
        await client.query("DELETE FROM users WHERE role IN ('vet', 'trainer')");

        const password_hash = await bcrypt.hash('password123', 10);

        // Vets in Cairo
        const vets = [
            { first_name: 'Ahmed', last_name: 'Mahmoud', email: 'ahmed.vet@example.com', lat: 30.0444, lng: 31.2357, clinic: 'Cairo Pet Clinic', license: 'EGY-V-1001', emergency: true, bio: 'Expert in small animal surgery and orthopedics.' },
            { first_name: 'Nour', last_name: 'El-Din', email: 'nour.vet@example.com', lat: 30.0600, lng: 31.2400, clinic: 'Nile Vet Hospital', license: 'EGY-V-1002', emergency: false, bio: 'General practice and preventive care.' },
            { first_name: 'Mona', last_name: 'Hassan', email: 'mona.vet@example.com', lat: 30.0500, lng: 31.2500, clinic: 'Maadi Feline Center', license: 'EGY-V-1003', emergency: true, bio: 'Specialized feline clinic.' },
            { first_name: 'Omar', last_name: 'Tariq', email: 'omar.vet@example.com', lat: 30.0400, lng: 31.2200, clinic: 'Zamalek Vet Care', license: 'EGY-V-1004', emergency: false, bio: 'Avian and exotic pets expert.' }
        ];

        for (const vet of vets) {
            const userRes = await client.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, role, latitude, longitude)
                VALUES ($1, $2, $3, $4, 'vet', $5, $6) RETURNING id
            `, [vet.email, password_hash, vet.first_name, vet.last_name, vet.lat, vet.lng]);
            const userId = userRes.rows[0].id;

            await client.query(`
                INSERT INTO vet_profiles (user_id, clinic_name, license_number, is_emergency, bio, status)
                VALUES ($1, $2, $3, $4, $5, 'approved')
            `, [userId, vet.clinic, vet.license, vet.emergency, vet.bio]);
        }

        // Trainers in Cairo
        const trainers = [
            { first_name: 'Tarek', last_name: 'Zaki', email: 'tarek.trainer@example.com', lat: 30.0450, lng: 31.2300, specialties: ['Obedience', 'Behavior'], bio: 'Over 10 years of experience with working dogs.' },
            { first_name: 'Salma', last_name: 'Ramy', email: 'salma.trainer@example.com', lat: 30.0550, lng: 31.2450, specialties: ['Agility', 'Puppy Training'], bio: 'Positive reinforcement training for all breeds.' }
        ];

        for (const trainer of trainers) {
            const userRes = await client.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, role, latitude, longitude)
                VALUES ($1, $2, $3, $4, 'trainer', $5, $6) RETURNING id
            `, [trainer.email, password_hash, trainer.first_name, trainer.last_name, trainer.lat, trainer.lng]);
            const userId = userRes.rows[0].id;

            await client.query(`
                INSERT INTO trainer_profiles (user_id, specialties, bio, status)
                VALUES ($1, $2, $3, 'approved')
            `, [userId, trainer.specialties, trainer.bio]);
        }

        console.log("Seeded Egyptian Vets and Trainers successfully!");
        await client.end();
    } catch (err) {
        console.error("Error seeding:", err);
    }
}

seed();
