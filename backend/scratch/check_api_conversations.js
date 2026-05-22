import { query } from '../src/config/db.js';

async function check() {
  try {
    const userId = '37d5e8b1-14e3-4996-be21-12d926c31a0f'; // lolo@gmail.com
    
    // Simulate getConversations
    const sql = `
        WITH RankedMessages AS (
            SELECT 
                m.*,
                CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS partner_id,
                ROW_NUMBER() OVER (
                    PARTITION BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END 
                    ORDER BY created_at DESC
                ) as rn
            FROM messages m
            WHERE sender_id = $1 OR receiver_id = $1
        )
        SELECT 
            u.id as partner_id,
            u.first_name,
            u.last_name
        FROM RankedMessages r
        JOIN users u ON u.id = r.partner_id
        WHERE r.rn = 1
        ORDER BY r.created_at DESC;
    `;
    const convos = await query(sql, [userId]);
    console.log('API Conversations partner_ids:');
    convos.rows.forEach(c => {
      console.log(`- partner_id: "${c.partner_id}" (type: ${typeof c.partner_id}) | Name: ${c.first_name} ${c.last_name}`);
    });

    // Simulate getOnlineUsers
    const onlineRes = await query("SELECT id FROM users WHERE last_seen > NOW() - INTERVAL '3 minutes'");
    console.log('\nAPI Online user ids:');
    onlineRes.rows.forEach(r => {
      console.log(`- id: "${r.id}" (type: ${typeof r.id})`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
