import { query } from './src/config/db.js';

async function run() {
    try {
        // Just pick any user id
        const userRes = await query('SELECT id FROM users LIMIT 1');
        const user_id = userRes.rows[0].id;

        const content = "test post";
        const image_url = "https://res.cloudinary.com/dov42snih/image/upload/v1779133327/jbvgnmjwqnachgul9gxc.png";

        console.log('Inserting with:', user_id, content, image_url);
        
        const insertQuery = `
            INSERT INTO community_posts (user_id, content, image_url)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const result = await query(insertQuery, [user_id, content, image_url]);
        console.log('Inserted:', result.rows[0]);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}
run();
