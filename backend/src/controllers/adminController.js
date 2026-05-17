import { query } from '../config/db.js';

export const getAnalytics = async (req, res) => {
    try {
        // In a real application, you'd calculate these accurately using complex queries.
        // We'll approximate for the dashboard presentation.
        
        const appointmentsRes = await query('SELECT COUNT(*) as total FROM appointments');
        const totalAppointments = parseInt(appointmentsRes.rows[0].total) || 0;
        
        const usersRes = await query('SELECT COUNT(*) as total FROM users WHERE role = $1', ['user']);
        const totalUsers = parseInt(usersRes.rows[0].total) || 0;

        const mockAvgBookingValue = 85;
        const totalRevenue = totalAppointments * mockAvgBookingValue;

        // Mock growth percentages
        const revenueGrowth = '+12%';
        const bookingValueGrowth = '-2%';
        const customersGrowth = '+5%';
        const serviceFulfillment = '98.2%';

        // Mock detailed service performance
        const servicesPerformance = [
            { id: 1, name: 'Emergency Care', icon: 'medical_information', colorClass: 'primary', bookings: 432, revenue: 45200, growth: '+18.5%', status: 'Trending', statusClass: 'primary/10 text-primary' },
            { id: 2, name: 'Professional Grooming', icon: 'content_cut', colorClass: 'secondary', bookings: 891, revenue: 32150, growth: '+4.2%', status: 'Stable', statusClass: 'surface-container-high text-on-surface-variant' },
            { id: 3, name: 'Behavioral Training', icon: 'pets', colorClass: 'tertiary', bookings: 156, revenue: 12480, growth: '-2.1%', status: 'Declining', statusClass: 'error-container text-on-error-container' },
            { id: 4, name: 'Routine Vaccination', icon: 'health_and_safety', colorClass: 'primary', bookings: 1024, revenue: 25600, growth: '+12.8%', status: 'Trending', statusClass: 'primary/10 text-primary' }
        ];

        res.status(200).json({
            summary: {
                totalRevenue,
                avgBookingValue: mockAvgBookingValue,
                totalUsers,
                serviceFulfillment,
                growth: {
                    revenue: revenueGrowth,
                    avgBookingValue: bookingValueGrowth,
                    customers: customersGrowth
                }
            },
            servicesPerformance
        });
    } catch (error) {
        console.error('Error fetching admin analytics:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getUsers = async (req, res) => {
    try {
        const queryText = `
            SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.profile_pic_url,
                   COALESCE(vp.status, tp.status, 'approved') as verification_status,
                   vp.license_number, vp.clinic_name, tp.specialties
            FROM users u
            LEFT JOIN vet_profiles vp ON u.id = vp.user_id
            LEFT JOIN trainer_profiles tp ON u.id = tp.user_id
            ORDER BY u.created_at DESC
        `;
        const result = await query(queryText);
        res.status(200).json({ users: result.rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const verifyProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Check if user is vet or trainer
        const userRes = await query('SELECT role FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const role = userRes.rows[0].role;
        let updateQuery = '';

        if (role === 'vet') {
            updateQuery = 'UPDATE vet_profiles SET status = $1 WHERE user_id = $2 RETURNING *';
        } else if (role === 'trainer') {
            updateQuery = 'UPDATE trainer_profiles SET status = $1 WHERE user_id = $2 RETURNING *';
        } else {
            return res.status(400).json({ error: 'User is not a professional' });
        }

        const result = await query(updateQuery, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Professional profile not found' });
        }

        res.status(200).json({ message: `Profile updated to ${status}` });
    } catch (error) {
        console.error('Error updating verification status:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllServices = async (req, res) => {
    try {
        const queryText = `
            SELECT s.*, u.first_name, u.last_name, u.email
            FROM services s
            JOIN users u ON s.provider_id = u.id
            ORDER BY s.created_at DESC
        `;
        const result = await query(queryText);
        res.status(200).json({ services: result.rows });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllBookings = async (req, res) => {
    try {
        const queryText = `
            SELECT b.id, b.status, b.start_time, b.total_price, b.created_at,
                   c.first_name as client_first_name, c.last_name as client_last_name,
                   p.first_name as provider_first_name, p.last_name as provider_last_name,
                   s.title as service_title
            FROM service_bookings b
            JOIN users c ON b.client_id = c.id
            JOIN services s ON b.service_id = s.id
            JOIN users p ON s.provider_id = p.id
            ORDER BY b.created_at DESC
        `;
        const result = await query(queryText);
        res.status(200).json({ bookings: result.rows });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
