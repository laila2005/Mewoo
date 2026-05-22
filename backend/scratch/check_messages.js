import { query } from '../src/config/db.js';

async function check() {
  try {
    const res = await query(
      `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at,
              u1.first_name || ' ' || u1.last_name as sender_name,
              u2.first_name || ' ' || u2.last_name as receiver_name
       FROM messages m
       JOIN users u1 ON m.sender_id = u1.id
       JOIN users u2 ON m.receiver_id = u2.id
       WHERE m.sender_id = '37d5e8b1-14e3-4996-be21-12d926c31a0f' OR m.receiver_id = '37d5e8b1-14e3-4996-be21-12d926c31a0f'
       ORDER BY m.created_at DESC LIMIT 10`
    );
    console.log('Recent messages for lolo@gmail.com:');
    res.rows.forEach(r => {
      console.log(`- From: ${r.sender_name} (${r.sender_id}) | To: ${r.receiver_name} (${r.receiver_id}) | Content: "${r.content}" | At: ${r.created_at.toISOString()}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
