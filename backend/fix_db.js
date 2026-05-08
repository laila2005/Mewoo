import { query } from './src/config/db.js';

async function fixDB() {
    try {
        await query('ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);');
        await query(`
            CREATE TABLE IF NOT EXISTS post_comments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await query(`
            CREATE TABLE IF NOT EXISTS post_likes (
                post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (post_id, user_id)
            );
        `);
        console.log("DB Fixed successfully");
        process.exit(0);
    } catch(e) {
        console.error("Error fixing DB:", e);
        process.exit(1);
    }
}
fixDB();
