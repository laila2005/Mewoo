import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isLocal = connectionString && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'));

const pool = connectionString
  ? new pg.Pool({
      connectionString,
      ssl: isLocal ? false : {
        rejectUnauthorized: false
      }
    })
  : new pg.Pool({
      user: process.env.POSTGRES_USER || 'petpluse_admin',
      password: process.env.POSTGRES_PASSWORD || 'petpluse_password123',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'petpluse_db'
    });

async function run() {
    const client = await pool.connect();
    try {
        console.log('Updating user locations to real Cairo coordinates...');
        
        await client.query(`UPDATE users SET latitude = 30.0263, longitude = 31.4913, neighborhood = 'New Cairo' WHERE email = 'ahmed.hassan@gmail.com'`);
        await client.query(`UPDATE users SET latitude = 30.0901, longitude = 31.3228, neighborhood = 'Heliopolis' WHERE email = 'sara.mostafa@gmail.com'`);
        await client.query(`UPDATE users SET latitude = 29.9529, longitude = 30.9220, neighborhood = '6th of October' WHERE email = 'omar.khaled@gmail.com'`);
        
        await client.query(`UPDATE users SET latitude = 30.0626, longitude = 31.2223, neighborhood = 'Zamalek' WHERE email = 'dr.nour@gmail.com'`);
        await client.query(`UPDATE users SET latitude = 29.9602, longitude = 31.2569, neighborhood = 'Maadi' WHERE email = 'trainer.youssef@gmail.com'`);
        await client.query(`UPDATE users SET latitude = 30.0444, longitude = 31.2357, neighborhood = 'Bab al Luq' WHERE email = 'laila.ibrahim@gmail.com'`);
        
        console.log('Locations updated successfully!');
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
