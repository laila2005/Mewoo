import pg from 'pg';
const p = new pg.Pool({user:'petpulse_app',password:'secure_app_password_2026',host:'localhost',port:5432,database:'petpulse_db'});
const r = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'pets' ORDER BY ordinal_position`);
console.log('Pets columns:', r.rows.map(x=>x.column_name).join(', '));
await p.end();
