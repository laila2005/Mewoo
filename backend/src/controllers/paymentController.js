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
        let serviceQuery = await query('SELECT id, provider_id FROM services LIMIT 1');
        let dummyServiceId, dummyProviderId;

        if (serviceQuery.rows.length === 0) {
            // Check if there is ANY trainer we can use as a provider to satisfy the foreign key constraint
            const providerQuery = await query('SELECT user_id FROM trainer_profiles LIMIT 1');
            if (providerQuery.rows.length === 0) {
                return res.status(500).json({ error: 'System configuration error: No trainer available to map order.' });
            }
            dummyProviderId = providerQuery.rows[0].user_id;

            // Create a generic "Marketplace Order" service
            const insertService = await query(`
                INSERT INTO services (provider_id, title, description, category, base_price, is_active)
                VALUES ($1, 'Marketplace Order', 'Generic service used for physical product orders.', 'training', 0, true)
                RETURNING id
            `, [dummyProviderId]);
            dummyServiceId = insertService.rows[0].id;
        } else {
            dummyServiceId = serviceQuery.rows[0].id;
            dummyProviderId = serviceQuery.rows[0].provider_id;
        }

        // 1. Create a Booking Record to represent this cart order
        const bookingInsert = await query(`
            INSERT INTO service_bookings (client_id, service_id, start_time, end_time, total_price, status)
            VALUES ($1, $2, NOW(), NOW() + INTERVAL '1 hour', $3, 'accepted')
            RETURNING id
        `, [userId, dummyServiceId, total_amount]);
        
        const bookingId = bookingInsert.rows[0].id;

        // 2. Create Pending Payment Record with order details
        const paymentInsert = await query(`
            INSERT INTO payments (booking_id, payer_id, payee_id, amount, currency, gateway_name, status, order_details)
            VALUES ($1, $2, $3, $4, 'EGP', 'paymob', 'pending', $5)
            RETURNING id
        `, [bookingId, userId, dummyProviderId, total_amount, JSON.stringify(items)]);

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
                // Fetch payment details before updating
                const paymentRes = await query('SELECT payer_id, order_details FROM payments WHERE booking_id = $1', [bookingId]);
                
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

                // Create user subscriptions if applicable
                if (paymentRes.rows.length > 0) {
                    const { payer_id, order_details } = paymentRes.rows[0];
                    if (order_details && Array.isArray(order_details)) {
                        for (const item of order_details) {
                            if (item.category === 'subscriptions') {
                                await query(`
                                    INSERT INTO user_subscriptions (user_id, plan_id, plan_name, status, price, next_billing_date)
                                    VALUES ($1, $2, $3, 'active', $4, NOW() + INTERVAL '30 days')
                                `, [payer_id, item.id, item.title, item.base_price]);
                            }
                        }
                    }
                }
            }
        }

        res.status(200).send('Webhook received');
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};
