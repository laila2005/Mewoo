import { query } from './src/config/db.js';

async function alterDb() {
  try {
    console.log('Adding cover_url to users...');
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url VARCHAR;`);
    console.log('Database altered successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error altering database:', error);
    process.exit(1);
  }
}

alterDb();
