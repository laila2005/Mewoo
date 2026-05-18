import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
    user: 'petpulse_app',
    password: 'secure_app_password_2026',
    host: 'localhost',
    port: 5432,
    database: 'petpulse_db'
});

async function seed() {
    const client = await pool.connect();
    try {
        console.log('--- Checking/Creating missing schema ---');

        // Check if bio column exists on users
        const bioCheck = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bio'`);
        if (bioCheck.rows.length === 0) {
            console.log('  bio column missing — skipping bio inserts (need superuser ALTER)');
        }
        const hasBio = bioCheck.rows.length > 0;

        // Check if notifications table exists
        const notifCheck = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications'`);
        const hasNotif = notifCheck.rows.length > 0;
        if (!hasNotif) {
            console.log('  notifications table missing — trying to create...');
            try {
                await client.query(`
                    CREATE TABLE notifications (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        type VARCHAR(50) NOT NULL DEFAULT 'system_alert',
                        title VARCHAR(255) NOT NULL,
                        message TEXT NOT NULL,
                        is_read BOOLEAN DEFAULT FALSE,
                        action_url VARCHAR(512) DEFAULT '/messages',
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                `);
                console.log('  ✓ notifications table created');
            } catch (e) {
                console.log('  ⚠ Could not create notifications table:', e.message);
            }
        } else {
            console.log('  ✓ notifications table exists');
        }

        // === SEED REAL USERS ===
        console.log('\n--- Seeding users ---');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('admin', salt);

        const users = [
            { email: 'ahmed.hassan@gmail.com', first_name: 'Ahmed', last_name: 'Hassan', role: 'owner' },
            { email: 'sara.mostafa@gmail.com', first_name: 'Sara', last_name: 'Mostafa', role: 'owner' },
            { email: 'omar.khaled@gmail.com', first_name: 'Omar', last_name: 'Khaled', role: 'owner' },
            { email: 'dr.nour@gmail.com', first_name: 'Dr. Nour', last_name: 'El-Din', role: 'vet' },
            { email: 'laila.ibrahim@gmail.com', first_name: 'Laila', last_name: 'Ibrahim', role: 'owner' },
            { email: 'trainer.youssef@gmail.com', first_name: 'Youssef', last_name: 'Adel', role: 'trainer' },
        ];

        const insertedIds = [];

        for (const u of users) {
            const existing = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
            if (existing.rows.length > 0) {
                console.log(`  ${u.first_name} ${u.last_name} exists (id: ${existing.rows[0].id})`);
                insertedIds.push(existing.rows[0].id);
            } else {
                const result = await client.query(
                    `INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [u.email, passwordHash, u.first_name, u.last_name, u.role]
                );
                console.log(`  Created: ${u.first_name} ${u.last_name} (id: ${result.rows[0].id})`);
                insertedIds.push(result.rows[0].id);

                if (u.role === 'vet') {
                    try {
                        await client.query(
                            `INSERT INTO vet_profiles (user_id, clinic_name, license_number, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
                            [result.rows[0].id, 'Cairo Pet Clinic', 'VET-2024-001', 'approved']
                        );
                    } catch (e) {}
                } else if (u.role === 'trainer') {
                    try {
                        await client.query(
                            `INSERT INTO trainer_profiles (user_id, specialties, status) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                            [result.rows[0].id, ['Obedience', 'Behavior Modification', 'Puppy Training'], 'approved']
                        );
                    } catch (e) {}
                }
            }
        }

        const [ahmed_id, sara_id, omar_id, nour_id, laila_id, youssef_id] = insertedIds;

        // === SEED PETS ===
        console.log('\n--- Seeding pets ---');
        const pets = [
            { name: 'Max', species: 'Dog', breed: 'Golden Retriever', age_years: 3, weight_kg: 30, owner_id: ahmed_id, is_adoptable: false, is_mating: true },
            { name: 'Luna', species: 'Cat', breed: 'Persian', age_years: 2, weight_kg: 4, owner_id: sara_id, is_adoptable: false, is_mating: false },
            { name: 'Simba', species: 'Cat', breed: 'Orange Tabby', age_years: 1, weight_kg: 3.5, owner_id: sara_id, is_adoptable: true, is_mating: false },
            { name: 'Charlie', species: 'Dog', breed: 'Beagle', age_years: 1, weight_kg: 8, owner_id: omar_id, is_adoptable: false, is_mating: false },
            { name: 'Ziko', species: 'Bird', breed: 'African Grey Parrot', age_years: 5, weight_kg: 1, owner_id: laila_id, is_adoptable: false, is_mating: false },
            { name: 'Rex', species: 'Dog', breed: 'German Shepherd', age_years: 4, weight_kg: 35, owner_id: ahmed_id, is_adoptable: false, is_mating: true },
        ];

        for (const p of pets) {
            const existing = await client.query('SELECT id FROM pets WHERE name = $1 AND owner_id = $2', [p.name, p.owner_id]);
            if (existing.rows.length > 0) {
                console.log(`  Pet ${p.name} exists, skipping.`);
            } else {
                const result = await client.query(
                    `INSERT INTO pets (name, species, breed, age_years, weight_kg, owner_id, is_adoptable, is_mating) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                    [p.name, p.species, p.breed, p.age_years, p.weight_kg, p.owner_id, p.is_adoptable, p.is_mating]
                );
                console.log(`  Created pet: ${p.name} (id: ${result.rows[0].id})`);
            }
        }

        // === SEED ACCEPTED CHAT REQUESTS ===
        console.log('\n--- Seeding chat connections ---');
        const chatPairs = [
            { sender: ahmed_id, receiver: sara_id },
            { sender: omar_id, receiver: ahmed_id },
            { sender: sara_id, receiver: nour_id },
            { sender: omar_id, receiver: youssef_id },
        ];

        for (const pair of chatPairs) {
            const exists = await client.query(
                'SELECT id FROM chat_requests WHERE sender_id = $1 AND receiver_id = $2',
                [pair.sender, pair.receiver]
            );
            if (exists.rows.length === 0) {
                await client.query(
                    `INSERT INTO chat_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'accepted')`,
                    [pair.sender, pair.receiver]
                );
                console.log(`  Connected: sender → receiver`);
            } else {
                await client.query('UPDATE chat_requests SET status = $1 WHERE id = $2', ['accepted', exists.rows[0].id]);
                console.log(`  Already connected, ensured accepted.`);
            }
        }

        // === SEED MESSAGES ===
        console.log('\n--- Seeding messages ---');
        // Clean old seeded messages to prevent duplicates
        await client.query('DELETE FROM messages WHERE sender_id = ANY($1) AND receiver_id = ANY($1)', [insertedIds]);

        const messageData = [
            { sender: ahmed_id, receiver: sara_id, content: 'Hi Sara! I saw your post about Simba. He looks absolutely adorable 🐱' },
            { sender: sara_id, receiver: ahmed_id, content: 'Thank you Ahmed! Yes, Simba is a sweetheart. Are you interested in adopting him?' },
            { sender: ahmed_id, receiver: sara_id, content: "I'm definitely considering it! My Golden, Max, is very friendly with cats." },
            { sender: sara_id, receiver: ahmed_id, content: "That sounds wonderful! How about this Saturday at the Maadi park?" },
            { sender: ahmed_id, receiver: sara_id, content: "Perfect! Saturday 10 AM works for me. I'll bring some treats 🦴" },

            { sender: omar_id, receiver: ahmed_id, content: 'Hey Ahmed! I just got my Beagle puppy Charlie. Any tips?' },
            { sender: ahmed_id, receiver: omar_id, content: 'Congrats Omar! Be patient with training and keep treats handy — Beagles are very food motivated 😄' },
            { sender: omar_id, receiver: ahmed_id, content: 'Haha I noticed! Any vet you recommend for his first checkup?' },
            { sender: ahmed_id, receiver: omar_id, content: "Dr. Nour El-Din is fantastic. She's on PetPulse — you can book directly!" },

            { sender: sara_id, receiver: nour_id, content: "Dr. Nour, my cat Luna has been sneezing a lot lately. Should I be worried?" },
            { sender: nour_id, receiver: sara_id, content: "Hi Sara! Is she eating normally? Any discharge from the nose or eyes?" },
            { sender: sara_id, receiver: nour_id, content: "She's eating fine, no discharge. It happens more when I clean the house." },
            { sender: nour_id, receiver: sara_id, content: "Sounds like environmental irritation. Try pet-safe cleaners. If it persists, book an appointment." },

            { sender: omar_id, receiver: youssef_id, content: "Hi Youssef! I need help — my puppy Charlie pulls on the leash terribly." },
            { sender: youssef_id, receiver: omar_id, content: "Hey Omar! Very common with Beagles. Want to book a training session?" },
            { sender: omar_id, receiver: youssef_id, content: "Yes please! What days are you available this week?" },
        ];

        for (const msg of messageData) {
            await client.query(
                `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)`,
                [msg.sender, msg.receiver, msg.content]
            );
        }
        console.log(`  Seeded ${messageData.length} messages across 4 conversations.`);

        // === SEED COMMUNITY POSTS ===
        console.log('\n--- Seeding community posts ---');
        const posts = [
            { user_id: ahmed_id, content: "Max just graduated from advanced obedience training! 🎓🐕 So proud. Thanks Trainer Youssef!" },
            { user_id: sara_id, content: "Simba is still looking for his forever home! 🏡 1yo orange tabby, neutered & vaccinated. #AdoptDontShop" },
            { user_id: omar_id, content: "First week with Charlie the Beagle and nothing is safe from his nose 😂 Any tips for beagle-proofing?" },
            { user_id: laila_id, content: "Ziko learned to say 'Good morning' this week! Just like a tiny feathered human 🦜" },
            { user_id: youssef_id, content: "Quick tip: Building trust is more important than teaching commands. Patience > punishment, always. 🐾❤️" },
        ];

        for (const post of posts) {
            try {
                const existing = await client.query('SELECT id FROM community_posts WHERE user_id = $1 AND content = $2', [post.user_id, post.content]);
                if (existing.rows.length === 0) {
                    await client.query(`INSERT INTO community_posts (user_id, content) VALUES ($1, $2)`, [post.user_id, post.content]);
                }
            } catch (e) {
                console.log(`  Post insert error: ${e.message}`);
            }
        }
        console.log(`  Seeded ${posts.length} community posts.`);

        // === SEED NOTIFICATIONS ===
        if (hasNotif || true) { // try anyway
            console.log('\n--- Seeding notifications ---');
            try {
                const notifications = [
                    { user_id: ahmed_id, type: 'unread_message', title: 'New Message', message: 'Sara Mostafa sent you a message', action_url: '/messages' },
                    { user_id: sara_id, type: 'system_alert', title: 'Adoption Interest', message: 'Ahmed Hassan is interested in adopting Simba!', action_url: '/messages' },
                    { user_id: omar_id, type: 'system_alert', title: 'Request Accepted', message: 'Trainer Youssef accepted your request!', action_url: '/messages' },
                ];

                for (const notif of notifications) {
                    await client.query(
                        'INSERT INTO notifications (user_id, type, title, message, action_url) VALUES ($1, $2, $3, $4, $5)',
                        [notif.user_id, notif.type, notif.title, notif.message, notif.action_url]
                    );
                }
                console.log(`  Seeded ${notifications.length} notifications.`);
            } catch (e) {
                console.log(`  Notifications insert failed: ${e.message}`);
            }
        }

        console.log('\n========================================');
        console.log('✅ Database seeded successfully!');
        console.log('========================================');
        console.log('\nAll users have password: admin');
        console.log('');
        users.forEach(u => console.log(`  📧 ${u.email}  →  ${u.first_name} ${u.last_name} (${u.role})`));
        console.log('');

    } catch (err) {
        console.error('Seed error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
