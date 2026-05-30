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

        // 1. Validate pricing to prevent price tampering
        let calculatedTotal = 0;
        for (const item of items) {
            if (item.category === 'subscriptions' || item.type === 'subscription') {
                calculatedTotal += parseFloat(item.base_price || 0);
            } else if (item.provider_id) {
                calculatedTotal += parseFloat(item.base_price || 0);
            } else {
                const prodRes = await query('SELECT base_price FROM marketplace_products WHERE id = $1', [item.id]);
                if (prodRes.rows.length > 0) {
                    calculatedTotal += parseFloat(prodRes.rows[0].base_price) * (parseInt(item.quantity) || 1);
                } else {
                    calculatedTotal += parseFloat(item.base_price || 0);
                }
            }
        }
        
        const final_amount = calculatedTotal > 0 ? calculatedTotal : total_amount;

        // 2. Create a Booking Record to represent this cart order
        const bookingInsert = await query(`
            INSERT INTO service_bookings (client_id, service_id, start_time, end_time, total_price, status)
            VALUES ($1, $2, NOW(), NOW() + INTERVAL '1 hour', $3, 'accepted')
            RETURNING id
        `, [userId, dummyServiceId, final_amount]);
        
        const bookingId = bookingInsert.rows[0].id;

        // 3. Create Pending Payment Record with order details
        const paymentInsert = await query(`
            INSERT INTO payments (booking_id, payer_id, payee_id, amount, currency, gateway_name, status, order_details)
            VALUES ($1, $2, $3, $4, 'EGP', 'paymob', 'pending', $5)
            RETURNING id
        `, [bookingId, userId, dummyProviderId, final_amount, JSON.stringify(items)]);

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
                // Idempotency check and fetch payment details before updating
                const paymentRes = await query('SELECT status, payer_id, order_details FROM payments WHERE booking_id = $1', [bookingId]);
                
                if (paymentRes.rows.length === 0) return res.status(404).send('Not found');
                if (paymentRes.rows[0].status === 'completed') return res.status(200).send('Already processed');
                
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
                            if (item.category === 'subscriptions' || item.type === 'subscription' || item.category === 'subscription') {
                                await query(`
                                    INSERT INTO user_subscriptions (user_id, plan_id, plan_name, status, price, next_billing_date)
                                    VALUES ($1, $2, $3, 'active', $4, NOW() + INTERVAL '30 days')
                                `, [payer_id, item.id, item.title, item.base_price]);
                            } else if (item && item.provider_id) {
                                // Dynamic care consultation booking (Veterinarian / Pet Trainer)
                                const providerId = item.provider_id;
                                
                                // 1. Fetch payer's first pet, or dynamically create one if they don't have any registered yet
                                const petRes = await query('SELECT id FROM pets WHERE owner_id = $1 LIMIT 1', [payer_id]);
                                let petId = null;
                                if (petRes.rows.length > 0) {
                                    petId = petRes.rows[0].id;
                                } else {
                                    const defaultPetRes = await query(`
                                        INSERT INTO pets (owner_id, name, species, breed)
                                        VALUES ($1, 'My Pet', 'Dog', 'Mixed')
                                        RETURNING id
                                    `, [payer_id]);
                                    petId = defaultPetRes.rows[0].id;
                                }

                                // 2. Parse Scheduled Date and Time Slot dynamically
                                const dateStr = item.date || new Date().toISOString().split('T')[0];
                                const timeStr = item.time || '11:00 AM';
                                
                                let hours = 12;
                                let minutes = 0;
                                
                                if (timeStr) {
                                    const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
                                    if (timeParts) {
                                        hours = parseInt(timeParts[1], 10);
                                        minutes = parseInt(timeParts[2], 10);
                                        const ampm = timeParts[3].toUpperCase();
                                        if (ampm === 'PM' && hours < 12) hours += 12;
                                        if (ampm === 'AM' && hours === 12) hours = 0;
                                    }
                                }
                                
                                const appointmentTime = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`).toISOString();

                                // 3. Insert confirmed record into appointments table
                                const reasonText = item.title || 'Paid Care Consultation';
                                await query(`
                                    INSERT INTO appointments (pet_id, vet_user_id, appointment_time, reason, status)
                                    VALUES ($1, $2, $3, $4, 'confirmed')
                                `, [petId, providerId, appointmentTime, reasonText]);

                                // 4. Align payments table payee_id to credit professional's analytics
                                await query(`
                                    UPDATE payments 
                                    SET payee_id = $1 
                                    WHERE booking_id = $2
                                `, [providerId, bookingId]);

                                // 5. Create database notification for Vet/Trainer
                                const profNotifTitle = 'New Booking Confirmed!';
                                const profNotifMsg = `A pet parent has booked a session with you on ${new Date(appointmentTime).toLocaleString()} for ${item.base_price} EGP.`;
                                const profNotifUrl = '/pro-dashboard';

                                const notificationInsert = await query(`
                                    INSERT INTO notifications (user_id, type, title, message, action_url)
                                    VALUES ($1, 'appointment', $2, $3, $4)
                                    RETURNING *
                                `, [providerId, profNotifTitle, profNotifMsg, profNotifUrl]);

                                // 6. Real-time Socket.io push alert to professional
                                try {
                                    const io = req.app.get('io');
                                    if (io && notificationInsert.rows.length > 0) {
                                        const savedNotif = notificationInsert.rows[0];
                                        io.to(String(providerId)).emit('new_notification', {
                                            id: savedNotif.id,
                                            type: savedNotif.type,
                                            title: savedNotif.title,
                                            message: savedNotif.message,
                                            action_url: savedNotif.action_url,
                                            time: savedNotif.created_at || new Date()
                                        });
                                    }
                                } catch (sockErr) {
                                    console.error('Professional socket notification dispatch failed:', sockErr.message);
                                }
                            } else {
                                // Dynamic product purchase processing
                                const productRes = await query(`
                                    SELECT p.*, s.owner_id 
                                    FROM marketplace_products p
                                    JOIN pet_shops s ON p.shop_id = s.id
                                    WHERE p.id = $1
                                `, [item.id]);

                                if (productRes.rows.length > 0) {
                                    const product = productRes.rows[0];
                                    const vendorId = product.owner_id;
                                    const quantityBought = parseInt(item.quantity) || 1;

                                    // 1. Decrement product stock quantity
                                    await query(`
                                        UPDATE marketplace_products 
                                        SET quantity = GREATEST(0, quantity - $1) 
                                        WHERE id = $2
                                    `, [quantityBought, item.id]);

                                    // 2. Align payment payee_id to update vendor dashboard stats
                                    await query(`
                                        UPDATE payments 
                                        SET payee_id = $1 
                                        WHERE booking_id = $2
                                    `, [vendorId, bookingId]);

                                    // 3. Create database notification for vendor
                                    const notifTitle = 'New Product Purchase!';
                                    const notifMsg = `A customer has purchased your product "${product.title}" for ${product.base_price} EGP. Stock has been updated.`;
                                    const notifUrl = '/vendor-dashboard';

                                    const notificationInsert = await query(`
                                        INSERT INTO notifications (user_id, type, title, message, action_url)
                                        VALUES ($1, 'purchase', $2, $3, $4)
                                        RETURNING *
                                    `, [vendorId, notifTitle, notifMsg, notifUrl]);

                                    // 4. Real-time Socket.io push alert
                                    try {
                                        const io = req.app.get('io');
                                        if (io && notificationInsert.rows.length > 0) {
                                            const savedNotif = notificationInsert.rows[0];
                                            io.to(String(vendorId)).emit('new_notification', {
                                                id: savedNotif.id,
                                                type: savedNotif.type,
                                                title: savedNotif.title,
                                                message: savedNotif.message,
                                                action_url: savedNotif.action_url,
                                                time: savedNotif.created_at || new Date()
                                            });
                                            console.log(`Real-time purchase notification dispatched to vendor ${vendorId}`);
                                        }
                                    } catch (sockErr) {
                                        console.error('Socket notification dispatch failed:', sockErr.message);
                                    }
                                }
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

export const simulatePaymentSuccess = async (req, res) => {
    try {
        const userId = req.user.id;
        const { booking_id } = req.body;
        
        // Verify payment belongs to user and is pending
        const paymentRes = await query('SELECT id, amount, status FROM payments WHERE booking_id = $1 AND payer_id = $2', [booking_id, userId]);
        if (paymentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found or unauthorized' });
        }
        if (paymentRes.rows[0].status === 'completed') {
            return res.status(400).json({ error: 'Payment already processed' });
        }
        
        // Construct mock webhook payload
        const mockWebhookReq = {
            body: {
                type: 'TRANSACTION',
                obj: {
                    id: Math.floor(Math.random() * 1000000),
                    order: { id: booking_id },
                    success: true
                }
            },
            app: req.app
        };
        
        // Call webhook directly
        await paymobWebhook(mockWebhookReq, {
            status: () => ({ send: () => {}, json: () => {} })
        });
        
        res.status(200).json({ message: 'Payment simulated successfully' });
    } catch (error) {
        console.error('Simulation Error:', error);
        res.status(500).json({ error: 'Simulation failed' });
    }
};
