import { query } from '../config/db.js';

export const getProviders = async (req, res) => {
    try {
        const vetsQuery = `
            SELECT u.id, u.first_name, u.last_name, u.latitude, u.longitude, u.profile_pic_url,
                   v.clinic_name, v.is_emergency, v.bio, v.license_number
            FROM users u
            JOIN vet_profiles v ON u.id = v.user_id
            WHERE u.role = 'vet' AND v.status = 'approved'
        `;
        
        const trainersQuery = `
            SELECT u.id, u.first_name, u.last_name, u.latitude, u.longitude, u.profile_pic_url,
                   t.specialties, t.bio
            FROM users u
            JOIN trainer_profiles t ON u.id = t.user_id
            WHERE u.role = 'trainer' AND t.status = 'approved'
        `;

        const [vetsRes, trainersRes] = await Promise.all([
            query(vetsQuery),
            query(trainersQuery)
        ]);

        res.status(200).json({
            vets: vetsRes.rows,
            trainers: trainersRes.rows
        });
    } catch (error) {
        console.error('Error fetching providers:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
