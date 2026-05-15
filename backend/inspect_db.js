import { query } from './src/config/db.js';

async function inspectDb() {
    try {
        const tablesRes = await query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        const tables = tablesRes.rows.map(r => r.table_name);
        
        for (const table of tables) {
            const columnsRes = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [table]);
            console.log(`Table: ${table}`);
            console.log(columnsRes.rows);
            console.log('-------------------------');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
inspectDb();
