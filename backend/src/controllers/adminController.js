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
