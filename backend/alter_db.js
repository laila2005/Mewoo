import { query } from './src/config/db.js';

async function alterDB() {
    try {
        console.log('Altering profile_pic_url column to TEXT...');
        await query('ALTER TABLE users ALTER COLUMN profile_pic_url TYPE TEXT;');
        console.log('Success!');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

alterDB();
