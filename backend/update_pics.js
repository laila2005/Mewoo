import { query } from './src/config/db.js';

async function updatePics() {
    try {
        const vetPics = [
            'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
            'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300',
            'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300'
        ];
        
        const trainerPics = [
            'https://images.unsplash.com/photo-1587764379873-97814989119d?auto=format&fit=crop&q=80&w=300',
            'https://images.unsplash.com/photo-1623387641168-d9803ddd3f35?auto=format&fit=crop&q=80&w=300',
            'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=300'
        ];
        
        const ownerPics = [
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300',
            'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=300'
        ];
        
        const petPics = [
            'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=300', // dog
            'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=300', // cat
            'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=300', // dog
            'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=300'  // cat
        ];

        // Vets
        const vetsRes = await query(`SELECT id FROM users WHERE role = 'vet'`);
        for (let i = 0; i < vetsRes.rows.length; i++) {
            await query(`UPDATE users SET profile_pic_url = $1 WHERE id = $2`, [vetPics[i % vetPics.length], vetsRes.rows[i].id]);
        }

        // Trainers
        const trainersRes = await query(`SELECT id FROM users WHERE role = 'trainer'`);
        for (let i = 0; i < trainersRes.rows.length; i++) {
            await query(`UPDATE users SET profile_pic_url = $1 WHERE id = $2`, [trainerPics[i % trainerPics.length], trainersRes.rows[i].id]);
        }
        
        // Owners
        const ownersRes = await query(`SELECT id FROM users WHERE role = 'owner' AND profile_pic_url IS NULL`);
        for (let i = 0; i < ownersRes.rows.length; i++) {
            await query(`UPDATE users SET profile_pic_url = $1 WHERE id = $2`, [ownerPics[i % ownerPics.length], ownersRes.rows[i].id]);
        }
        
        // Pets
        const petsRes = await query(`SELECT id FROM pets WHERE avatar_url IS NULL`);
        for (let i = 0; i < petsRes.rows.length; i++) {
            await query(`UPDATE pets SET avatar_url = $1 WHERE id = $2`, [petPics[i % petPics.length], petsRes.rows[i].id]);
        }
        
        console.log('All remaining profile and pet pictures updated successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Error updating pictures:', e);
        process.exit(1);
    }
}

updatePics();
