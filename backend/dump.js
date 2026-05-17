import { query } from './src/config/db.js';
async function dump() {
  const res = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'vet_profiles';
  `);
  console.log('VET PROFILES:');
  console.log(res.rows);
  
  const res2 = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'trainer_profiles';
  `);
  console.log('TRAINER PROFILES:');
  console.log(res2.rows);

  process.exit(0);
}
dump();
