import { query } from '../src/config/db.js';

async function check() {
  try {
    const res = await query(
      "SELECT id, first_name, last_name, email, last_seen, (last_seen > NOW() - INTERVAL '3 minutes') as is_active FROM users WHERE first_name ILIKE '%Laila%' AND last_name ILIKE '%Fikry%'"
    );
    console.log('Laila Fikry users in database:');
    res.rows.forEach(r => {
      console.log(`- ID: ${r.id} | Email: ${r.email} | Last Seen: ${r.last_seen ? r.last_seen.toISOString() : 'never'} | Is Active: ${r.is_active}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
