import { query } from './src/config/db.js';

async function check() {
  try {
    const chatReqs = await query('SELECT * FROM chat_requests ORDER BY created_at DESC LIMIT 10');
    console.log('--- CHAT REQUESTS ---');
    console.log(JSON.stringify(chatReqs.rows, null, 2));

    const notifs = await query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10');
    console.log('--- NOTIFICATIONS ---');
    console.log(JSON.stringify(notifs.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
