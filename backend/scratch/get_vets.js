import pg from 'pg';

const pool = new pg.Pool({
    user: 'postgres',
    password: 'medfylolo',
    host: 'localhost',
    port: 5432,
    database: 'petpluse_db'
});

async function main() {
    try {
        const users = await pool.query("SELECT id, email, first_name, last_name, role, latitude, longitude FROM users WHERE role IN ('vet', 'trainer')");
        console.log("Vets and Trainers in users table:");
        console.log(users.rows);
        
        for (const user of users.rows) {
            if (user.role === 'vet') {
                const vetProfile = await pool.query("SELECT * FROM vet_profiles WHERE user_id = $1", [user.id]);
                console.log(`Vet Profile for ${user.email}:`, vetProfile.rows);
            } else if (user.role === 'trainer') {
                const trainerProfile = await pool.query("SELECT * FROM trainer_profiles WHERE user_id = $1", [user.id]);
                console.log(`Trainer Profile for ${user.email}:`, trainerProfile.rows);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

main();
