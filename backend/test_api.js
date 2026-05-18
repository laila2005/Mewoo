import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from './src/config/db.js';

dotenv.config();

async function run() {
    try {
        const userRes = await query('SELECT id FROM users LIMIT 1');
        const user_id = userRes.rows[0].id;
        
        const token = jwt.sign({ id: user_id, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const payload = { 
            content: ' ', 
            image_url: 'https://res.cloudinary.com/dov42snih/image/upload/v1779133327/jbvgnmjwqnachgul9gxc.png' 
        };

        console.log('Sending payload:', payload);

        const response = await fetch('http://localhost:5000/api/community/posts', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Error Status:', response.status);
            console.error('Error Data:', data);
            process.exit(1);
        }

        console.log('Success:', data);
        process.exit(0);
    } catch (e) {
        console.error('Error Message:', e.message);
        process.exit(1);
    }
}
run();
