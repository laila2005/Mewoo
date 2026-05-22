import { query } from './src/config/db.js';

async function check() {
  try {
    const trainers = await query('SELECT * FROM trainer_profiles');
    console.log("Trainer Profiles:", JSON.stringify(trainers.rows, null, 2));
    
    const vets = await query('SELECT * FROM vet_profiles');
    console.log("Vet Profiles:", JSON.stringify(vets.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
