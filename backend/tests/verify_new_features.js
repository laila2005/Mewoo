import { io } from 'socket.io-client';
import { query } from '../src/config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://127.0.0.1:5000/api';
const SOCKET_URL = 'http://127.0.0.1:5000';

async function verifyFeatures() {
    console.log('===============================================================');
    console.log('🚀 Mewoo New Features Integration & Real-Time E2E Test Suite 🚀');
    console.log('===============================================================\n');

    try {
        // -------------------------------------------------------------
        // FEATURE 1: Lost & Found Public Reports
        // -------------------------------------------------------------
        console.log('🔹 [FEATURE 1/4] Verifying Lost & Found reports fetch...');
        const lfRes = await fetch(`${API_BASE}/lost-found/lost`);
        const lfData = await lfRes.json();
        
        if (!lfRes.ok) {
            throw new Error(`Failed to load lost & found reports: ${JSON.stringify(lfData)}`);
        }
        console.log(`   ✅ Lost & Found API returned ${lfData.reports ? lfData.reports.length : 0} reports successfully.`);

        // -------------------------------------------------------------
        // FEATURE 2: Adoption Applications details & status view
        // -------------------------------------------------------------
        console.log('\n🔹 [FEATURE 2/4] Verifying Adoption Application detailed tracking...');
        
        // Log in as Ahmed Hassan
        const ahmedLogin = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'ahmed.hassan@gmail.com', password: 'admin' })
        });
        const ahmedData = await ahmedLogin.json();
        if (!ahmedLogin.ok) {
            throw new Error(`Ahmed login failed: ${JSON.stringify(ahmedData)}`);
        }
        const ahmedToken = ahmedData.token;
        console.log(`   Logged in as ${ahmedData.user.first_name} ${ahmedData.user.last_name}.`);

        // Dynamic Seed: Adoption application for Simba
        console.log('   Checking/Seeding adoption application for Simba...');
        const ahmedUser = await query("SELECT id FROM users WHERE email = 'ahmed.hassan@gmail.com'");
        const saraUser = await query("SELECT id FROM users WHERE email = 'sara.mostafa@gmail.com'");
        const simbaPet = await query("SELECT id FROM pets WHERE name = 'Simba'");
        
        if (ahmedUser.rows.length > 0 && saraUser.rows.length > 0 && simbaPet.rows.length > 0) {
            const ahmedId = ahmedUser.rows[0].id;
            const saraId = saraUser.rows[0].id;
            const simbaId = simbaPet.rows[0].id;
            
            await query(`
                INSERT INTO adoption_applications (pet_id, applicant_id, owner_id, applicant_name, applicant_phone, applicant_message, pet_experience, housing_type, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (pet_id, applicant_id) DO NOTHING
            `, [simbaId, ahmedId, saraId, 'Ahmed Hassan', '01012345678', 'I would love to adopt Simba, he is adorable!', 'I have raised 2 cats and 1 dog in the past.', 'Apartment', 'pending']);
            console.log('   ✅ Seeded Simba adoption application successfully.');
        }

        // Fetch applications
        const appsRes = await fetch(`${API_BASE}/adoptions/my-applications`, {
            headers: { Authorization: `Bearer ${ahmedToken}` }
        });
        const appsData = await appsRes.json();
        if (!appsRes.ok) {
            throw new Error(`Failed to fetch my applications: ${JSON.stringify(appsData)}`);
        }
        
        console.log(`   ✅ Returned ${appsData.applications.length} applications.`);
        const simbaApp = appsData.applications.find(a => a.pet_name === 'Simba');
        if (!simbaApp) {
            throw new Error('Could not find the seeded adoption application for Simba!');
        }
        console.log(`   ✅ Verified details of Simba adoption application:`);
        console.log(`      - Pet Name: ${simbaApp.pet_name} (${simbaApp.species} - ${simbaApp.breed})`);
        console.log(`      - Status: ${simbaApp.status}`);
        console.log(`      - Housing Environment: ${simbaApp.housing_type}`);
        console.log(`      - Applicant Message: "${simbaApp.applicant_message}"`);

        // -------------------------------------------------------------
        // FEATURE 3: Admin system diagnostics & DB maintenance center
        // -------------------------------------------------------------
        console.log('\n🔹 [FEATURE 3/4] Verifying Admin Diagnostics & Maintenance center...');
        
        // Log in as Admin
        const adminLogin = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@petpluse.com', password: 'admin' })
        });
        const adminData = await adminLogin.json();
        if (!adminLogin.ok) {
            throw new Error(`Admin login failed: ${JSON.stringify(adminData)}`);
        }
        const adminToken = adminData.token;
        console.log(`   Logged in as Admin.`);

        // Call database telemetry /db/metrics
        console.log('   Testing /db/metrics connection...');
        const metricsRes = await fetch(`${API_BASE}/admin/db/metrics`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const metricsData = await metricsRes.json();
        if (!metricsRes.ok) {
            throw new Error(`Failed to fetch database metrics: ${JSON.stringify(metricsData)}`);
        }
        console.log(`   ✅ DB Telemetry Metrics returned successfully:`);
        console.log(`      - Database Size: ${metricsData.metrics.dbSize}`);
        console.log(`      - Active Connection Pool: ${metricsData.metrics.activeConnections}`);
        console.log(`      - Table Counts Counted: ${metricsData.metrics.tableStats.length} tables`);

        // Call database backup /db/backup
        console.log('   Testing One-Click DB Backup trigger...');
        const backupRes = await fetch(`${API_BASE}/admin/db/backup`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const backupData = await backupRes.json();
        if (!backupRes.ok) {
            throw new Error(`Failed database backup: ${JSON.stringify(backupData)}`);
        }
        console.log(`   ✅ DB Backup triggered successfully: ${backupData.message}`);
        console.log(`      - Backup File Path: ${backupData.backupPath}`);

        // Call index optimization /db/optimize-indexes
        console.log('   Testing Index Optimization trigger...');
        const optRes = await fetch(`${API_BASE}/admin/db/optimize-indexes`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const optData = await optRes.json();
        if (!optRes.ok) {
            throw new Error(`Failed index optimization: ${JSON.stringify(optData)}`);
        }
        console.log(`   ✅ DB Index Optimization completed successfully: ${optData.message}`);

        // Call cache-clearing /db/clear-cache
        console.log('   Testing System Diagnostics Cache Clear trigger...');
        const ccRes = await fetch(`${API_BASE}/admin/db/clear-cache`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const ccData = await ccRes.json();
        if (!ccRes.ok) {
            throw new Error(`Failed clear cache: ${JSON.stringify(ccData)}`);
        }
        console.log(`   ✅ Diagnostics Cache cleared successfully: ${ccData.message}`);

        // -------------------------------------------------------------
        // FEATURE 4: WebSocket messaging moderation & auto-ban shield
        // -------------------------------------------------------------
        console.log('\n🔹 [FEATURE 4/4] Verifying Real-Time WebSocket Moderation & Auto-Ban Shield...');
        
        // Log in as standard user Omar Khaled
        const omarLogin = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'omar.khaled@gmail.com', password: 'admin' })
        });
        const omarData = await omarLogin.json();
        if (!omarLogin.ok) {
            throw new Error(`Omar login failed: ${JSON.stringify(omarData)}`);
        }
        const omarToken = omarData.token;
        const omarId = omarData.user.id;
        console.log(`   Logged in as Standard User Omar Khaled (${omarId}).`);

        // Connect standard socket client
        console.log('   Establishing WebSocket connection with handshake token...');
        const socket = io(SOCKET_URL, {
            auth: { token: omarToken }
        });

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                socket.disconnect();
                reject(new Error('WebSocket connection timed out!'));
            }, 5000);

            socket.on('connect', () => {
                console.log('   ✅ Real-time WebSocket connection established successfully.');
                clearTimeout(timeout);
                resolve();
            });

            socket.on('connect_error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        // Test inappropriate message auto-ban
        console.log('   Sending violating chat content to trigger Auto-Moderator shield ("This is a piece of shit")...');
        
        const banPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Auto-ban and socket disconnection did not fire within timeout!'));
            }, 8000);

            socket.on('error', (errMessage) => {
                console.log(`   ✅ Received expected community guidelines error event:`);
                console.log(`      - Message: "${errMessage}"`);
                if (errMessage.includes('violated our community safety guidelines')) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    reject(new Error(`Unexpected socket error received: ${errMessage}`));
                }
            });

            socket.on('disconnect', (reason) => {
                console.log(`   ✅ WebSocket client disconnected immediately by server (Reason: ${reason}).`);
            });

            // Emit inappropriate message content
            socket.emit('send_message', {
                receiver_id: '8ed87c7f-751e-4673-95c0-3b66d8992294', // Sara Mostafa ID
                content: 'This is a piece of shit'
            });
        });

        await banPromise;
        console.log('   ✅ Auto-ban WebSocket drop verified successfully.');

        // Verify user is banned in DB (password hash prefixed with 'BANNED:')
        console.log('   Verifying user account status in database pool...');
        const dbVerify = await query('SELECT password_hash FROM users WHERE id = $1', [omarId]);
        const passwordHash = dbVerify.rows[0].password_hash;
        console.log(`      - DB password_hash: "${passwordHash}"`);
        if (!passwordHash.startsWith('BANNED:')) {
            throw new Error('User was NOT marked as BANNED in the database password_hash!');
        }
        console.log('   ✅ Account status confirmed as BANNED in database storage.');

        // Verify audit log exists
        console.log('   Verifying Auto-Moderator audit log has been written...');
        const auditLogRes = await query('SELECT * FROM audit_logs WHERE action = $1 ORDER BY timestamp DESC LIMIT 1', ['Account banned by Auto-Moderator']);
        if (auditLogRes.rows.length === 0) {
            throw new Error('No Auto-Moderator audit log entry was written to DB!');
        }
        console.log(`   ✅ Audit log verified successfully:`);
        console.log(`      - Log level: ${auditLogRes.rows[0].level}`);
        console.log(`      - Message: ${auditLogRes.rows[0].details}`);

        // Try to log in again (should fail)
        console.log('   Attempting to log in again as banned user Omar (Should fail with credentials error)...');
        const loginFail = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'omar.khaled@gmail.com', password: 'admin' })
        });
        const failData = await loginFail.json();
        console.log(`      - Response status: ${loginFail.status}`);
        console.log(`      - Response JSON: ${JSON.stringify(failData)}`);
        
        if (loginFail.status !== 403 || !failData.error.includes('Your account has been banned by an administrator.')) {
            throw new Error(`Banned login response was not restricted or returned unexpected error: ${JSON.stringify(failData)}`);
        }
        console.log('   ✅ Login blockade validated. Account is completely locked down.');

        console.log('\n===============================================================');
        console.log('🎉 ALL INTEGRATION AND REAL-TIME TESTS PASSED SUCCESSFULLY! 🎉');
        console.log('===============================================================');
        
        // Clean up Omar's ban so the system remains consistent for further runs
        console.log('\n🧹 Restoring Omar Khaled account status for future tests...');
        const cleanHash = passwordHash.replace('BANNED:', '');
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [cleanHash, omarId]);
        console.log('   Omar account restored.');
        
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST SUITE FAILURE ❌');
        console.error(error.message);
        
        // Clean up Omar's ban if necessary
        try {
            const omarFetch = await query("SELECT password_hash FROM users WHERE email = 'omar.khaled@gmail.com'");
            if (omarFetch.rows.length > 0) {
                const hash = omarFetch.rows[0].password_hash;
                if (hash.startsWith('BANNED:')) {
                    await query("UPDATE users SET password_hash = $1 WHERE email = 'omar.khaled@gmail.com'", [hash.replace('BANNED:', '')]);
                    console.log('🧹 Cleaned up Omar Khaled ban state on error.');
                }
            }
        } catch (e) {}

        process.exit(1);
    }
}

verifyFeatures();
