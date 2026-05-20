import { query } from './src/config/db.js';
query("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'marketplace_products'").then(res => {
    console.log(res.rows);
    process.exit(0);
});
