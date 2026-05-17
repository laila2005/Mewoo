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

        // Clear existing trainers
        await client.query("DELETE FROM trainer_profiles");
        await client.query("DELETE FROM users WHERE role = 'trainer'");

        const password_hash = await bcrypt.hash('password123', 10);

        const trainers = [
            { 
                first_name: 'Sarah', 
                last_name: 'Mitchell', 
                email: 'sarah.trainer@example.com', 
                lat: 30.0500, lng: 31.2500, // Near Cairo
                profile_pic_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAeboUEUwvpk9UmApGpuiCaolOo8Fuc76Jj2Zh5f5ZV6kxm18_PlZfczxCrknspdDbkZLAos1fV7-Q9IIVbniCMG6F7wGcQUe1wTs1HG7Ubh_E3AqvzFifJVRHSy-9gqBPwu34Q1HZsOHtmiaA-5wAUYI-00qIY6FfejBbScBHEYW3tln6Llaf_roPnolEyEOxzkJ1i2yXH-tWBVElK9EA0LY4wuDfzpwbFLnSA_l7gKnBGlMhEnBsfv2REN8D8KpcIAwvb3Bm9w67O',
                specialties: ['Behavior Correction', 'Positive Reinforcement'], 
                bio: 'Specialist in Behavior Correction & Positive Reinforcement. 12+ Years Exp.' 
            },
            { 
                first_name: 'David', 
                last_name: 'Chen', 
                email: 'david.trainer@example.com', 
                lat: 30.0400, lng: 31.2400, 
                profile_pic_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDK1INXKRnyHrybj-Zl0BIGBT9krZG1yASD7kfWb4NQRubM9pz3JoF2We6jkAWY54FRllYffF9WXoFURA8l1P6ThawIldepHodzuM3retj-Sr2SavhslcHg4gPveuMsVXZD8jDJ53MsiB-y4pAOCWN78C4fQtmVj7Jv9HnEr3ULLpyCzgegsNXY3gZoK5rvg7H6yVQepNKeOvEWyL1MujrO7CcGk16lJEpw9SOKoHnfSWcX8-BHhNE0q81FNLf8Av07BilL9c8y66aO',
                specialties: ['Puppy Foundations', 'Socialization'], 
                bio: 'Puppy Foundations and Socialization Specialist. 8 Years Exp.' 
            },
            { 
                first_name: 'Elena', 
                last_name: 'Rodriguez', 
                email: 'elena.trainer@example.com', 
                lat: 30.0600, lng: 31.2300, 
                profile_pic_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwytCT8l5djzL5IKhMNjJJtsb7QOrAMJPuLOLu0_2tEYiB8bySBxr3xmVN3JFs98_32A6iex3tWI4QxfjDhI29uUD2xGt2B0huUYKgY9Qw2XYzh-SodBDmc3SsJ_I681SBJUgLPwiEaTLaNgA0ToJr_5P4ABEjgXUWPYAamsJsuQiUtpCy3UiYMaFpJ5SZtSLneROuhYEIfVz-rPXQkSA8F5tMiuv8t2e4OAM1UbwH3oNBAB_tLWSBXbUE6m0jqGU-OJ4LhY1qmP1N',
                specialties: ['Advanced Obedience', 'Competitive K9'], 
                bio: 'Advanced Obedience and Competitive K9 Training. 15 Years Exp.' 
            },
            { 
                first_name: 'Tarek', 
                last_name: 'Zaki', 
                email: 'tarek.trainer@example.com', 
                lat: 30.0450, lng: 31.2300, 
                profile_pic_url: null,
                specialties: ['Obedience', 'Behavior'], 
                bio: 'Over 10 years of experience with working dogs. Focused on reliable everyday obedience.' 
            },
            { 
                first_name: 'Salma', 
                last_name: 'Ramy', 
                email: 'salma.trainer@example.com', 
                lat: 30.0550, lng: 31.2450, 
                profile_pic_url: null,
                specialties: ['Agility', 'Puppy Training'], 
                bio: 'Positive reinforcement training for all breeds. Making learning fun for your furry friend!' 
            }
        ];

        for (const trainer of trainers) {
            const userRes = await client.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, role, latitude, longitude, profile_pic_url)
                VALUES ($1, $2, $3, $4, 'trainer', $5, $6, $7) RETURNING id
            `, [trainer.email, password_hash, trainer.first_name, trainer.last_name, trainer.lat, trainer.lng, trainer.profile_pic_url]);
            const userId = userRes.rows[0].id;

            await client.query(`
                INSERT INTO trainer_profiles (user_id, specialties, bio, status)
                VALUES ($1, $2, $3, 'approved')
            `, [userId, trainer.specialties, trainer.bio]);
        }

        console.log("Seeded Trainers successfully!");
        await client.end();
    } catch (err) {
        console.error("Error seeding:", err);
    }
}

seed();
