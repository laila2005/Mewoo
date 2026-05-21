import { query } from './src/config/db.js';

async function check() {
  try {
    const users = await query('SELECT id, first_name, last_name, email, role FROM users');
    console.log(JSON.stringify(users.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
