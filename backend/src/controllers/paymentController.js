import { query } from '../config/db.js';

export const initiateCheckout = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items, total_amount, billing_data } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // We need a dummy service_id because the schema only supports service_bookings
        // In a real e-commerce expansion, we would create a `product_orders` table.
        const serviceQuery = await query('SELECT id, provider_id FROM services LIMIT 1');
        if (serviceQuery.rows.length === 0) {
            return res.status(500).json({ error: 'System configuration error: No services available to map order.' });
        }
        
        const dummyServiceId = serviceQuery.rows[0].id;
        const dummyProviderId = serviceQuery.rows[0].provider_id;

        // 1. Create a Booking Record to represent this cart order
        const bookingInsert = await query(`
            INSERT INTO service_bookings (client_id, service_id, start_time, end_time, total_price, status)
            VALUES ($1, $2, NOW(), NOW() + INTERVAL '1 hour', $3, 'accepted')
            RETURNING id
        `, [userId, dummyServiceId, total_amount]);
        
        const bookingId = bookingInsert.rows[0].id;

        // 2. Create Pending Payment Record
        const paymentInsert = await query(`
            INSERT INTO payments (booking_id, payer_id, payee_id, amount, currency, gateway_name, status)
            VALUES ($1, $2, $3, $4, 'EGP', 'paymob', 'pending')
            RETURNING id
        `, [bookingId, userId, dummyProviderId, total_amount]);

        // 3. Mock Paymob API Flow
        // Real flow: Authenticate -> Register Order -> Get Payment Key Token
        // Since we are mocked for local dev, we just return the order ID.
        
        res.status(200).json({
            message: 'Payment session created successfully',
            order_id: bookingId,
            payment_id: paymentInsert.rows[0].id,
            paymob_token: 'mock_paymob_token_123456789'
        });

    } catch (error) {
        console.error('Checkout Error:', error);
        res.status(500).json({ error: 'Failed to process checkout' });
    }
};

export const paymobWebhook = async (req, res) => {
    try {
        const { type, obj } = req.body;

        if (type === 'TRANSACTION') {
            const bookingId = obj.order.id;
            const success = obj.success;

            if (success) {
                // Update payment to completed
                await query(`
                    UPDATE payments 
                    SET status = 'completed', gateway_transaction_id = $1, updated_at = NOW()
                    WHERE booking_id = $2
                `, [obj.id.toString(), bookingId]);
                
                // Update booking status
                await query(`
                    UPDATE service_bookings
                    SET status = 'completed'
                    WHERE id = $1
                `, [bookingId]);
            }
        }

        res.status(200).send('Webhook received');
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};
