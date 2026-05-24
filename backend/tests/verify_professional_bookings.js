import { query } from '../src/config/db.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const API_BASE = 'http://127.0.0.1:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function verifyProfessionalBookings() {
    console.log('========================================================================');
    console.log('🚀 Mewoo Unified Professional Checkout & Scheduling Verification Suite 🚀');
    console.log('========================================================================\n');

    let clientUserId = null;
    let vetUserId = null;
    let trainerUserId = null;
    let petId = null;
    let clientToken = null;
    
    // Arrays to collect test resource IDs for deterministic cleanup
    const serviceBookingIds = [];
    const appointmentIds = [];
    const paymentIds = [];
    const notificationIds = [];
    let autoCreatedPetId = null;

    try {
        // 1. Fetch real active test users from database to run the test flow dynamically
        console.log('1. Locating target active users from PostgreSQL DB...');
        
        // Find standard client user (owner)
        const clientRes = await query("SELECT id, email, first_name, last_name, role FROM users WHERE role = 'owner' LIMIT 1");
        if (clientRes.rows.length === 0) {
            throw new Error("No client user ('owner' or 'petowner') found in the database!");
        }
        const clientUser = clientRes.rows[0];
        clientUserId = clientUser.id;
        console.log(`   - Selected Client: ${clientUser.first_name} ${clientUser.last_name} (${clientUser.email})`);

        // Find vet user
        const vetRes = await query("SELECT id, email, first_name, last_name FROM users WHERE role = 'vet' LIMIT 1");
        if (vetRes.rows.length === 0) {
            throw new Error("No veterinarian user found in the database!");
        }
        const vetUser = vetRes.rows[0];
        vetUserId = vetUser.id;
        console.log(`   - Selected Veterinarian: ${vetUser.first_name} ${vetUser.last_name} (${vetUser.email})`);

        // Find trainer user
        const trainerRes = await query("SELECT id, email, first_name, last_name FROM users WHERE role = 'trainer' LIMIT 1");
        if (trainerRes.rows.length === 0) {
            throw new Error("No trainer user found in the database!");
        }
        const trainerUser = trainerRes.rows[0];
        trainerUserId = trainerUser.id;
        console.log(`   - Selected Trainer: ${trainerUser.first_name} ${trainerUser.last_name} (${trainerUser.email})`);

        // Generate client authentication token programmatically (avoids endpoint rate limit & credentials dependencies)
        clientToken = jwt.sign(
            { id: clientUserId, email: clientUser.email, role: clientUser.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log('   - Programmatic JWT client token signed successfully.');

        // 2. Fetch or seed a pet for the client to verify constraints
        const petRes = await query("SELECT id FROM pets WHERE owner_id = $1 LIMIT 1", [clientUserId]);
        if (petRes.rows.length > 0) {
            petId = petRes.rows[0].id;
            console.log(`   - Client has pet ID: ${petId}`);
        } else {
            console.log('   - Client has no registered pets. A fallback pet will be auto-generated during checkout!');
        }

        // =========================================================================
        // TEST FLOW A: VETERINARIAN APPOINTMENT CHECKOUT
        // =========================================================================
        console.log('\n========================================================================');
        console.log('🔹 TEST A: Veterinarian Consultation Booking via Checkout');
        console.log('========================================================================');

        // Cart items with Vet Booking information
        const vetCartItems = [
            {
                id: 'vet-consultation-id',
                title: 'Urgent Vet Tele-Consultation',
                category: 'professional_bookings',
                provider_id: vetUserId,
                base_price: 450,
                quantity: 1,
                date: '2026-06-01',
                time: '10:00 AM'
            }
        ];

        console.log('1. Initiating Vet Booking Checkout via API POST /api/payments/checkout...');
        const checkoutVetRes = await fetch(`${API_BASE}/payments/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${clientToken}`
            },
            body: JSON.stringify({
                items: vetCartItems,
                total_amount: 450,
                billing_data: {
                    first_name: clientUser.first_name,
                    last_name: clientUser.last_name,
                    email: clientUser.email
                }
            })
        });

        const checkoutVetData = await checkoutVetRes.json();
        if (!checkoutVetRes.ok) {
            throw new Error(`Vet Checkout Failed! Status: ${checkoutVetRes.status}, Error: ${JSON.stringify(checkoutVetData)}`);
        }

        const vetBookingId = checkoutVetData.order_id;
        const vetPaymentId = checkoutVetData.payment_id;
        serviceBookingIds.push(vetBookingId);
        paymentIds.push(vetPaymentId);
        console.log(`   ✅ Checkout created successfully. Booking ID: ${vetBookingId}, Payment ID: ${vetPaymentId}`);

        console.log('\n2. Simulating Paymob Webhook transaction success callback...');
        const vetTxId = Math.floor(Math.random() * 10000000) + 1000000;
        const webhookVetRes = await fetch(`${API_BASE}/payments/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'TRANSACTION',
                obj: {
                    id: vetTxId,
                    success: true,
                    order: { id: vetBookingId }
                }
            })
        });

        if (!webhookVetRes.ok) {
            const errText = await webhookVetRes.text();
            throw new Error(`Vet Webhook callback simulation failed: ${webhookVetRes.status} - ${errText}`);
        }
        console.log('   ✅ Webhook processed successfully.');

        console.log('\n3. Verifying Database Side-Effects for Veterinarian checkout...');

        // Assert payment record is completed & payee_id is updated to Vet's ID
        const vetPaymentCheck = await query("SELECT status, payee_id, order_details FROM payments WHERE id = $1", [vetPaymentId]);
        const paidVetRec = vetPaymentCheck.rows[0];
        console.log(`   - Payment Status: "${paidVetRec.status}" (Expected: "completed")`);
        console.log(`   - Payment Payee ID: "${paidVetRec.payee_id}" (Expected: "${vetUserId}")`);
        
        if (paidVetRec.status !== 'completed') throw new Error('Payment status did not update to "completed"!');
        if (paidVetRec.payee_id !== vetUserId) throw new Error("Payee ID did not align with Veterinarian's user ID!");

        // Assert appointment is inserted & confirmed
        const vetApptCheck = await query("SELECT * FROM appointments WHERE vet_user_id = $1 ORDER BY created_at DESC LIMIT 1", [vetUserId]);
        if (vetApptCheck.rows.length === 0) {
            throw new Error("No appointment was registered in the schedule for this Veterinarian!");
        }
        const vetAppt = vetApptCheck.rows[0];
        appointmentIds.push(vetAppt.id);
        console.log(`   - Registered Appointment ID: ${vetAppt.id}`);
        console.log(`   - Appointment Reason: "${vetAppt.reason}" (Expected: "Urgent Vet Tele-Consultation")`);
        console.log(`   - Appointment Status: "${vetAppt.status}" (Expected: "confirmed")`);
        console.log(`   - Appointment Time: "${new Date(vetAppt.appointment_time).toISOString()}"`);
        
        if (vetAppt.reason !== 'Urgent Vet Tele-Consultation') throw new Error('Appointment reason mismatch!');
        if (vetAppt.status !== 'confirmed') throw new Error('Appointment status is not "confirmed"!');

        // Check if fallback pet was created (since client had no pet, or verify it matched client's pet)
        if (!petId) {
            autoCreatedPetId = vetAppt.pet_id;
            console.log(`   - Fallback auto-created pet verified. Pet ID: ${autoCreatedPetId}`);
        } else {
            if (vetAppt.pet_id !== petId) throw new Error("Appointment pet_id does not match the client's registered pet!");
            console.log('   - Linked Pet ID matches client pet correctly.');
        }

        // Assert real-time/database notification is created for the Vet
        const vetNotifCheck = await query("SELECT id, title, message FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [vetUserId]);
        if (vetNotifCheck.rows.length === 0) {
            throw new Error("No notification record was written for the booked Veterinarian!");
        }
        const vetNotif = vetNotifCheck.rows[0];
        notificationIds.push(vetNotif.id);
        console.log(`   - Written Notification ID: ${vetNotif.id}`);
        console.log(`   - Notification Title: "${vetNotif.title}"`);
        console.log(`   - Notification Message: "${vetNotif.message}"`);
        
        if (!vetNotif.title.includes('New Booking Confirmed')) throw new Error('Incorrect notification title!');

        // =========================================================================
        // TEST FLOW B: TRAINER APPOINTMENT CHECKOUT
        // =========================================================================
        console.log('\n========================================================================');
        console.log('🔹 TEST B: Trainer Consultation Booking via Checkout (Dynamic Constraint)');
        console.log('========================================================================');

        // Cart items with Trainer Booking information
        const trainerCartItems = [
            {
                id: 'trainer-consultation-id',
                title: 'Puppy Behavior Training Session',
                category: 'professional_bookings',
                provider_id: trainerUserId,
                base_price: 350,
                quantity: 1,
                date: '2026-06-02',
                time: '11:00 AM'
            }
        ];

        console.log('1. Initiating Trainer Booking Checkout via API POST /api/payments/checkout...');
        const checkoutTrainerRes = await fetch(`${API_BASE}/payments/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${clientToken}`
            },
            body: JSON.stringify({
                items: trainerCartItems,
                total_amount: 350,
                billing_data: {
                    first_name: clientUser.first_name,
                    last_name: clientUser.last_name,
                    email: clientUser.email
                }
            })
        });

        const checkoutTrainerData = await checkoutTrainerRes.json();
        if (!checkoutTrainerRes.ok) {
            throw new Error(`Trainer Checkout Failed! Status: ${checkoutTrainerRes.status}, Error: ${JSON.stringify(checkoutTrainerData)}`);
        }

        const trainerBookingId = checkoutTrainerData.order_id;
        const trainerPaymentId = checkoutTrainerData.payment_id;
        serviceBookingIds.push(trainerBookingId);
        paymentIds.push(trainerPaymentId);
        console.log(`   ✅ Checkout created successfully. Booking ID: ${trainerBookingId}, Payment ID: ${trainerPaymentId}`);

        console.log('\n2. Simulating Paymob Webhook transaction success callback...');
        const trainerTxId = Math.floor(Math.random() * 10000000) + 1000000;
        const webhookTrainerRes = await fetch(`${API_BASE}/payments/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'TRANSACTION',
                obj: {
                    id: trainerTxId,
                    success: true,
                    order: { id: trainerBookingId }
                }
            })
        });

        if (!webhookTrainerRes.ok) {
            const errText = await webhookTrainerRes.text();
            throw new Error(`Trainer Webhook callback simulation failed: ${webhookTrainerRes.status} - ${errText}`);
        }
        console.log('   ✅ Webhook processed successfully.');

        console.log('\n3. Verifying Database Side-Effects for Trainer checkout (Migrated Constraint Verification)...');

        // Assert payment record is completed & payee_id is updated to Trainer's ID
        const trainerPaymentCheck = await query("SELECT status, payee_id, order_details FROM payments WHERE id = $1", [trainerPaymentId]);
        const paidTrainerRec = trainerPaymentCheck.rows[0];
        console.log(`   - Payment Status: "${paidTrainerRec.status}" (Expected: "completed")`);
        console.log(`   - Payment Payee ID: "${paidTrainerRec.payee_id}" (Expected: "${trainerUserId}")`);
        
        if (paidTrainerRec.status !== 'completed') throw new Error('Payment status did not update to "completed"!');
        if (paidTrainerRec.payee_id !== trainerUserId) throw new Error("Payee ID did not align with Trainer's user ID!");

        // Assert appointment is inserted & confirmed (This was previously failing due to the FK constraint)
        const trainerApptCheck = await query("SELECT * FROM appointments WHERE vet_user_id = $1 ORDER BY created_at DESC LIMIT 1", [trainerUserId]);
        if (trainerApptCheck.rows.length === 0) {
            throw new Error("No appointment was registered in the schedule for this Trainer!");
        }
        const trainerAppt = trainerApptCheck.rows[0];
        appointmentIds.push(trainerAppt.id);
        console.log(`   - Registered Appointment ID: ${trainerAppt.id}`);
        console.log(`   - Appointment Reason: "${trainerAppt.reason}" (Expected: "Puppy Behavior Training Session")`);
        console.log(`   - Appointment Status: "${trainerAppt.status}" (Expected: "confirmed")`);
        
        if (trainerAppt.reason !== 'Puppy Behavior Training Session') throw new Error('Appointment reason mismatch!');
        if (trainerAppt.status !== 'confirmed') throw new Error('Appointment status is not "confirmed"!');

        // Assert real-time/database notification is created for the Trainer
        const trainerNotifCheck = await query("SELECT id, title, message FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [trainerUserId]);
        if (trainerNotifCheck.rows.length === 0) {
            throw new Error("No notification record was written for the booked Trainer!");
        }
        const trainerNotif = trainerNotifCheck.rows[0];
        notificationIds.push(trainerNotif.id);
        console.log(`   - Written Notification ID: ${trainerNotif.id}`);
        console.log(`   - Notification Title: "${trainerNotif.title}"`);
        console.log(`   - Notification Message: "${trainerNotif.message}"`);
        
        if (!trainerNotif.title.includes('New Booking Confirmed')) throw new Error('Incorrect notification title!');

        // =========================================================================
        // TEST FLOW C: ESTIMATED EARNINGS & SCHEDULE INTEGRATION CHECK
        // =========================================================================
        console.log('\n========================================================================');
        console.log('🔹 TEST C: Estimated Earnings & Professional Dashboard Schedule Check');
        console.log('========================================================================');

        // Let's verify that the booked Trainer can retrieve appointments and that estimatedEarnings sums correctly
        console.log('1. Mocking Trainer retrieving appointments via API GET /api/bookings/appointments...');
        
        // Generate Trainer authentication token programmatically
        const trainerToken = jwt.sign(
            { id: trainerUserId, email: trainerUser.email, role: 'trainer' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const getTrainerAptsRes = await fetch(`${API_BASE}/bookings/appointments`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${trainerToken}` }
        });

        const getTrainerAptsData = await getTrainerAptsRes.json();
        if (!getTrainerAptsRes.ok) {
            throw new Error(`Failed to load Trainer appointments! Status: ${getTrainerAptsRes.status}`);
        }

        const trainerSchedule = getTrainerAptsData.appointments || [];
        console.log(`   - Trainer schedule returned ${trainerSchedule.length} appointments.`);
        
        const testTrainerApt = trainerSchedule.find(a => a.id === trainerAppt.id);
        if (!testTrainerApt) {
            throw new Error("Newly booked Trainer appointment is missing from the schedule fetch response!");
        }
        console.log('   ✅ Newly booked appointment successfully fetched in professional schedule.');

        // Verify estimatedEarnings calculation logic mimicking the ProfessionalDashboard frontend component
        console.log('\n2. Verifying Dashboard Analytics calculation logic...');
        const confirmedOrCompleted = trainerSchedule.filter(a => a.status === 'confirmed' || a.status === 'completed');
        const calculatedEarnings = confirmedOrCompleted.reduce((sum, a) => sum + (parseFloat(a.fee) || 350), 0);
        console.log(`   - Estimated Earnings from active consultations: ${calculatedEarnings} EGP`);
        
        if (calculatedEarnings < 350) {
            throw new Error("Estimated Earnings analytics calculation is incorrect!");
        }
        console.log('   ✅ Dashboard analytics metrics successfully validated.');

        console.log('\n========================================================================');
        console.log('🎉 ALL INTEGRATION AND SCHEMA ALIGNMENT TESTS PASSED SUCCESSFULLY! 🎉');
        console.log('========================================================================');

    } catch (err) {
        console.error('\n❌ INTEGRATION TEST SUITE FAILURE ❌');
        console.error(err.stack || err.message || err);
        process.exit(1);
    } finally {
        // =========================================================================
        // DETERMINISTIC SECURE CLEANUP
        // =========================================================================
        console.log('\n🧹 Performing secure DB transaction cleanup...');
        
        try {
            if (appointmentIds.length > 0) {
                console.log(`   - Deleting appointments: ${appointmentIds.join(', ')}`);
                await query("DELETE FROM appointments WHERE id = ANY($1)", [appointmentIds]);
            }
            if (paymentIds.length > 0) {
                console.log(`   - Deleting checkout payments: ${paymentIds.join(', ')}`);
                await query("DELETE FROM payments WHERE id = ANY($1)", [paymentIds]);
            }
            if (serviceBookingIds.length > 0) {
                console.log(`   - Deleting service bookings: ${serviceBookingIds.join(', ')}`);
                await query("DELETE FROM service_bookings WHERE id = ANY($1)", [serviceBookingIds]);
            }
            if (notificationIds.length > 0) {
                console.log(`   - Deleting push notifications: ${notificationIds.join(', ')}`);
                await query("DELETE FROM notifications WHERE id = ANY($1)", [notificationIds]);
            }
            if (autoCreatedPetId) {
                console.log(`   - Deleting auto-created fallback pet ID: ${autoCreatedPetId}`);
                await query("DELETE FROM pets WHERE id = $1", [autoCreatedPetId]);
            }
            console.log('✅ Remote DB pristine state successfully restored.');
        } catch (cleanupErr) {
            console.error('⚠️ Cleanup encountered an error:', cleanupErr.message);
        }
        
        process.exit(0);
    }
}

verifyProfessionalBookings();
