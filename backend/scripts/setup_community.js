import pkg from 'pg';
const { Client } = pkg;

async function setupCommunity() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'petpulse_db',
        password: 'medfylolo',
        port: 5432,
    });

    try {
        await client.connect();
        
        // 1. Create tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS post_likes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(post_id, user_id)
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS post_comments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // We also need to make sure community_posts has an image_url if not already
        try {
            await client.query(`ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);`);
        } catch(e) {}

        // Get some users to act as authors
        const usersRes = await client.query('SELECT id, first_name, last_name FROM users LIMIT 3');
        if (usersRes.rows.length === 0) {
            console.log("No users found to author posts. Please sign up a user first.");
            await client.end();
            return;
        }

        const author1 = usersRes.rows[0].id;
        const author2 = usersRes.rows.length > 1 ? usersRes.rows[1].id : author1;
        const author3 = usersRes.rows.length > 2 ? usersRes.rows[2].id : author1;

        // Clear old mock posts to avoid duplicates
        await client.query("DELETE FROM community_posts");

        // Insert dummy posts
        const posts = [
            {
                user_id: author1,
                content: "Cooper finally mastered his **'stay'** command today! 🐾 So proud of this golden boy. Training takes patience but the bond we're building is everything. Any tips for teaching **'roll over'**?",
                image_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=600'
            },
            {
                user_id: author2,
                content: "🛡️ Flea & Tick Season Alert: Peak season is here! Make sure your pets are up to date on their monthly preventatives. Choose the right treatment for your breed and size.",
                image_url: null
            },
            {
                user_id: author3,
                content: "Does anyone have recommendations for a good vet clinic in Maadi that specializes in senior dogs? My 10-year-old Lab has been showing some joint stiffness lately and I want to get him checked properly.",
                image_url: null
            }
        ];

        for (const p of posts) {
            await client.query(`
                INSERT INTO community_posts (user_id, content, image_url)
                VALUES ($1, $2, $3)
            `, [p.user_id, p.content, p.image_url]);
        }

        console.log("Community tables and mock data initialized successfully.");
        await client.end();
    } catch (err) {
        console.error("Error:", err);
    }
}

setupCommunity();
