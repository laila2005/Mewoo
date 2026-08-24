import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from './src/config/db.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function setupTestUsers() {
    console.log('--- Setting Up Test Users ---');
    // Ensure clean state: delete test users if they exist
    await query('DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['test_a@petpluse.com', 'test_b@petpluse.com']);
    await query('DELETE FROM messages WHERE sender_id IN (SELECT id FROM users WHERE email IN ($1, $2)) OR receiver_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['test_a@petpluse.com', 'test_b@petpluse.com']);
    await query('DELETE FROM chat_requests WHERE sender_id IN (SELECT id FROM users WHERE email IN ($1, $2)) OR receiver_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['test_a@petpluse.com', 'test_b@petpluse.com']);
    await query('DELETE FROM users WHERE email IN ($1, $2)', ['test_a@petpluse.com', 'test_b@petpluse.com']);

    // Create user A
    const userARes = await query(`
        INSERT INTO users (first_name, last_name, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
    `, ['Alice', 'Sender', 'test_a@petpluse.com', 'hashedpassword', 'owner']);
    
    // Create user B
    const userBRes = await query(`
        INSERT INTO users (first_name, last_name, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
    `, ['Bob', 'Receiver', 'test_b@petpluse.com', 'hashedpassword', 'vet']);

    const userA = { id: userARes.rows[0].id, name: 'Alice Sender', email: 'test_a@petpluse.com' };
    const userB = { id: userBRes.rows[0].id, name: 'Bob Receiver', email: 'test_b@petpluse.com' };

    console.log(`Created Test User A (Sender): ${userA.name} (${userA.id})`);
    console.log(`Created Test User B (Receiver): ${userB.name} (${userB.id})`);
    
    return { userA, userB };
}

async function cleanUpUsers(userA_id, userB_id) {
    console.log('--- Cleaning Up Test Data ---');
    await query('DELETE FROM notifications WHERE user_id IN ($1, $2)', [userA_id, userB_id]);
    await query('DELETE FROM messages WHERE sender_id IN ($1, $2) OR receiver_id IN ($1, $2)', [userA_id, userB_id]);
    await query('DELETE FROM chat_requests WHERE sender_id IN ($1, $2) OR receiver_id IN ($1, $2)', [userA_id, userB_id]);
    await query('DELETE FROM users WHERE id IN ($1, $2)', [userA_id, userB_id]);
    console.log('Test database cleaned successfully.');
}

async function runTest() {
    let userA, userB;
    try {
        const users = await setupTestUsers();
        userA = users.userA;
        userB = users.userB;

        // Generate JWT Tokens
        const tokenA = jwt.sign({ id: userA.id, role: 'owner', email: userA.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const tokenB = jwt.sign({ id: userB.id, role: 'vet', email: userB.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        console.log('\n--- Step 1: User A sends a chat request to User B ---');
        const reqResponse = await fetch(`${API_BASE}/chat/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenA}`
            },
            body: JSON.stringify({ receiver_id: userB.id })
        });
        
        const reqData = await reqResponse.json();
        if (!reqResponse.ok) {
            throw new Error(`Failed to send chat request: ${JSON.stringify(reqData)}`);
        }
        
        const chatRequestId = reqData.request.id;
        console.log(`Success: Chat request created with ID: ${chatRequestId}, Status: ${reqData.request.status}`);
        if (reqData.request.status !== 'pending') {
            throw new Error('Initial status should be "pending"');
        }

        console.log('\n--- Step 2: User B fetches pending requests ---');
        const listResponse = await fetch(`${API_BASE}/chat/requests`, {
            headers: { Authorization: `Bearer ${tokenB}` }
        });
        const listData = await listResponse.json();
        if (!listResponse.ok) {
            throw new Error(`Failed to list chat requests: ${JSON.stringify(listData)}`);
        }
        
        const pendingRequest = listData.requests.find(r => r.id === chatRequestId);
        if (!pendingRequest) {
            throw new Error('User B could not find User A\'s pending chat request');
        }
        console.log(`Success: User B sees the pending request from ${pendingRequest.first_name} ${pendingRequest.last_name}`);

        console.log('\n--- Step 3: User B accepts User A\'s request ---');
        const acceptResponse = await fetch(`${API_BASE}/chat/request/${chatRequestId}/accept`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${tokenB}` }
        });
        const acceptData = await acceptResponse.json();
        if (!acceptResponse.ok) {
            throw new Error(`Failed to accept request: ${JSON.stringify(acceptData)}`);
        }
        console.log(`Success: Request status updated to: ${acceptData.request.status}`);
        if (acceptData.request.status !== 'accepted') {
            throw new Error('Status should be "accepted" after accepting request');
        }

        console.log('\n--- Step 4: Verify Notification was generated for User A ---');
        const notifRes = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userA.id]);
        if (notifRes.rows.length === 0) {
            throw new Error('No notification found for User A');
        }
        const notif = notifRes.rows[0];
        console.log(`Notification Found: [Title: "${notif.title}"] [Message: "${notif.message}"]`);
        if (notif.title !== 'Request Accepted' || !notif.message.includes('Bob Receiver')) {
            throw new Error('Notification contents do not match expectation');
        }
        console.log('Success: Correct system alert notification generated successfully in DB!');

        // Call the API endpoint to fetch notifications
        console.log('\n--- Step 4.1: Fetch notifications via API for User A ---');
        const apiNotifRes = await fetch(`${API_BASE}/users/notifications`, {
            headers: { Authorization: `Bearer ${tokenA}` }
        });
        const apiNotifData = await apiNotifRes.json();
        if (!apiNotifRes.ok) {
            throw new Error(`Failed to fetch notifications via API: ${JSON.stringify(apiNotifData)}`);
        }
        
        const foundAlert = apiNotifData.alerts.find(a => a.title === 'Request Accepted');
        if (!foundAlert) {
            throw new Error('Could not find the "Request Accepted" notification in API response');
        }
        console.log(`Success: Found notification via API: [Title: "${foundAlert.title}"] [Message: "${foundAlert.message}"]`);

        // Test marking notifications as read
        console.log('\n--- Step 4.2: Mark notifications as read via API for User A ---');
        const markReadRes = await fetch(`${API_BASE}/users/notifications/mark-read`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${tokenA}` }
        });
        const markReadData = await markReadRes.json();
        if (!markReadRes.ok) {
            throw new Error(`Failed to mark notifications as read: ${JSON.stringify(markReadData)}`);
        }
        console.log('Success: Notifications marked as read via API.');

        // Re-fetch notifications and verify it's cleared
        const apiNotifRes2 = await fetch(`${API_BASE}/users/notifications`, {
            headers: { Authorization: `Bearer ${tokenA}` }
        });
        const apiNotifData2 = await apiNotifRes2.json();
        const foundAlert2 = apiNotifData2.alerts.find(a => a.title === 'Request Accepted');
        if (foundAlert2) {
            throw new Error('Notification still returned after marking as read!');
        }
        console.log('Success: Notification cleared from active list after being marked as read!');

        console.log('\n--- Step 5: User A sends a message to User B ---');
        const msgResponse = await fetch(`${API_BASE}/messages/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenA}`
            },
            body: JSON.stringify({
                receiver_id: userB.id,
                content: 'Hello Bob! This is Alice.'
            })
        });
        const msgData = await msgResponse.json();
        if (!msgResponse.ok) {
            throw new Error(`Failed to send message: ${JSON.stringify(msgData)}`);
        }
        console.log(`Success: Message created with ID: ${msgData.message.id}, Content: "${msgData.message.content}"`);

        console.log('\n--- Step 6: User B fetches chat history with User A ---');
        const historyResponse = await fetch(`${API_BASE}/messages/${userA.id}`, {
            headers: { Authorization: `Bearer ${tokenB}` }
        });
        const historyData = await historyResponse.json();
        if (!historyResponse.ok) {
            throw new Error(`Failed to fetch history: ${JSON.stringify(historyData)}`);
        }
        const sentMessage = historyData.messages.find(m => m.id === msgData.message.id);
        if (!sentMessage) {
            throw new Error('User B could not find the message in history');
        }
        console.log(`Success: Message verified in chat history with content: "${sentMessage.content}"`);

        console.log('\n======================================');
        console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
        console.log('======================================');
        
        await cleanUpUsers(userA.id, userB.id);
        process.exit(0);
    } catch (err) {
        console.error('\n❌ TEST SUITE FAILURE ❌');
        console.error(err.message);
        if (userA && userB) {
            await cleanUpUsers(userA.id, userB.id);
        }
        process.exit(1);
    }
}

runTest();
