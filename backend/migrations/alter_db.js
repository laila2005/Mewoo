import { query } from './src/config/db.js';

async function alterDb() {
  try {
    console.log('Adding cover_url and custom_sections to vet_profiles...');
    await query(`ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS cover_url VARCHAR;`);
    await query(`ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS custom_sections JSONB DEFAULT '[]'::jsonb;`);
    
    console.log('Adding cover_url and custom_sections to trainer_profiles...');
    await query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS cover_url VARCHAR;`);
    await query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS custom_sections JSONB DEFAULT '[]'::jsonb;`);
    
    console.log('Database altered successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error altering database:', error);
    process.exit(1);
  }
}

alterDb();
