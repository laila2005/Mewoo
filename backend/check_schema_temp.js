import { query } from './src/config/db.js';

async function check() {
    try {
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'appointments';
        `);
        console.log("Appointments Table:");
        console.log(res.rows);

        const res2 = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'vet_profiles';
        `);
        console.log("Vet Profiles Table:");
        console.log(res2.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
