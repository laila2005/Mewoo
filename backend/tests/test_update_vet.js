import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'petpluse_app',
    password: 'secure_app_password_2026',
    host: 'localhost',
    port: 5432,
    database: 'petpluse_db',
});

async function run() {
    try {
        console.log('Testing custom_sections and cover_url insert...');
        const vetRes = await pool.query("SELECT * FROM vet_profiles LIMIT 1");
        if (vetRes.rows.length > 0) {
            const vetId = vetRes.rows[0].user_id;
            const res = await pool.query(
                `UPDATE vet_profiles SET cover_url = $1, custom_sections = $2 WHERE user_id = $3 RETURNING *`,
                ['http://example.com/cover.jpg', JSON.stringify([{title: 'Test', content: 'Content'}]), vetId]
            );
            console.log('Successfully updated vet_profiles:', res.rows[0].cover_url, res.rows[0].custom_sections);
        }
        console.log('Test successful!');
    } catch (e) {
        console.error('Error:', e.message);
    }
    await pool.end();
}

run();
