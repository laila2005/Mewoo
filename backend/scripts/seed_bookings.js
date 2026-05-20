import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'petpulse_app',
  host: 'localhost',
  database: 'petpulse_db',
  password: 'secure_app_password_2026',
  port: 5432,
});

async function run() {
  try {
    // Get a client user
    let userRes = await pool.query("SELECT id FROM users WHERE role = 'owner' LIMIT 1");
    if (userRes.rows.length === 0) {
        console.log("Creating dummy owner...");
        const res = await pool.query(`INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES ('Alice', 'Smith', 'alice@example.com', 'hash', 'owner') RETURNING id`);
        userRes = { rows: res.rows };
    }
    const clientId = userRes.rows[0].id;

    // Get some services
    const servicesRes = await pool.query("SELECT id, base_price FROM services LIMIT 3");
    if (servicesRes.rows.length === 0) {
        console.log("No services found to book.");
        return;
    }

    // Insert bookings
    for (let i = 0; i < servicesRes.rows.length; i++) {
        const s = servicesRes.rows[i];
        const status = i === 0 ? 'accepted' : (i === 1 ? 'completed' : 'requested');
        await pool.query(`
            INSERT INTO service_bookings (client_id, service_id, status, start_time, end_time, total_price)
            VALUES ($1, $2, $3, NOW() + interval '1 day', NOW() + interval '1 day 1 hour', $4)
        `, [clientId, s.id, status, s.base_price]);
    }

    console.log("Successfully seeded service_bookings!");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
