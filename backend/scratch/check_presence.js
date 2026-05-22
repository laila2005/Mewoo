import { query } from '../src/config/db.js';

async function check() {
  try {
    const timeRes = await query('SELECT NOW() as db_now, CURRENT_SETTING(\'TIMEZONE\') as db_tz');
    console.log('Database Time Info:', timeRes.rows[0]);

    const usersRes = await query(
      `SELECT id, first_name, last_name, email, last_seen, 
              (last_seen > NOW() - INTERVAL '3 minutes') as is_active_db
       FROM users 
       ORDER BY last_seen DESC NULLS LAST LIMIT 10`
    );
    console.log('Top 10 users by last_seen:');
    usersRes.rows.forEach(r => {
      console.log(`- ${r.first_name} ${r.last_seen ? r.last_seen.toISOString() : 'never'} | is_active_db: ${r.is_active_db} | Email: ${r.email} | ID: ${r.id}`);
    });
  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    process.exit(0);
  }
}

check();
