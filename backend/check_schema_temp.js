import { query } from './src/config/db.js';
query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1', ['marketplace_products'])
.then(res => { console.log(res.rows); process.exit(0); });
