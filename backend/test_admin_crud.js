import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from './src/config/db.js';

dotenv.config();

const API_ROOT = 'http://localhost:5000/api';

async function runTests() {
    console.log('🧪 Starting Programmatic Admin CRUD Endpoint Verification...');
    
    try {
        // 1. Fetch reference users from database to sign authentic tokens
        const adminUserRes = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        const regularUserRes = await query("SELECT id FROM users WHERE role != 'admin' LIMIT 1");
        
        if (adminUserRes.rows.length === 0) {
            console.error('❌ Error: No admin user found in database for signing admin token.');
            process.exit(1);
        }
        if (regularUserRes.rows.length === 0) {
            console.error('❌ Error: No non-admin user found in database.');
            process.exit(1);
        }
        
        const adminId = adminUserRes.rows[0].id;
        const regularId = regularUserRes.rows[0].id;
        
        const JWT_SECRET = process.env.JWT_SECRET || 'secret';
        
        const adminToken = jwt.sign({ id: adminId, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
        const regularToken = jwt.sign({ id: regularId, role: 'owner' }, JWT_SECRET, { expiresIn: '1h' });

        const testProductId = `test_p_${Date.now()}`;
        const productPayload = {
            id: testProductId,
            title: 'E2E Programmatic Test Toy',
            description: 'A robust dog chew toy verified by automated scripts.',
            category: 'toys',
            base_price: 999.99,
            image: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&q=80',
            badge: 'Test Pass'
        };

        // --- TEST CASE 1: Unauthenticated request should fail ---
        console.log('\n👉 Case 1: Posting product WITHOUT token...');
        const resUnauth = await fetch(`${API_ROOT}/admin/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productPayload)
        });
        
        console.log(`Status returned: ${resUnauth.status} (Expected: 401)`);
        if (resUnauth.status !== 401) {
            console.error('❌ FAILURE: Unauthenticated request did not return 401 Unauthorized.');
            process.exit(1);
        }
        console.log('✅ PASS: Unauthenticated access blocked correctly.');

        // --- TEST CASE 2: Non-admin request should fail with 403 Forbidden ---
        console.log('\n👉 Case 2: Posting product with NON-ADMIN token...');
        const resForbidden = await fetch(`${API_ROOT}/admin/products`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${regularToken}`
            },
            body: JSON.stringify(productPayload)
        });
        
        console.log(`Status returned: ${resForbidden.status} (Expected: 403)`);
        if (resForbidden.status !== 403) {
            console.error('❌ FAILURE: Non-admin request did not return 403 Forbidden.');
            process.exit(1);
        }
        console.log('✅ PASS: Non-admin access restricted correctly.');

        // --- TEST CASE 3: Authorized Admin Product Creation ---
        console.log('\n👉 Case 3: Creating product as ADMIN...');
        const resCreate = await fetch(`${API_ROOT}/admin/products`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`
            },
            body: JSON.stringify(productPayload)
        });
        
        const createData = await resCreate.json();
        console.log(`Status returned: ${resCreate.status} (Expected: 201)`);
        if (resCreate.status !== 201) {
            console.error('❌ FAILURE: Admin creation failed:', createData);
            process.exit(1);
        }
        console.log('✅ PASS: Product successfully created inside postgres.', createData);

        // --- TEST CASE 4: Authorized Admin Product Update ---
        console.log('\n👉 Case 4: Updating created product as ADMIN...');
        const updatePayload = {
            title: 'Updated E2E Test Toy',
            base_price: 1049.50,
            badge: 'Super Test Pass'
        };
        const resUpdate = await fetch(`${API_ROOT}/admin/products/${testProductId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`
            },
            body: JSON.stringify(updatePayload)
        });
        
        const updateData = await resUpdate.json();
        console.log(`Status returned: ${resUpdate.status} (Expected: 200)`);
        if (resUpdate.status !== 200) {
            console.error('❌ FAILURE: Admin update failed:', updateData);
            process.exit(1);
        }
        console.log('✅ PASS: Product successfully updated in database.', updateData);

        // --- TEST CASE 5: Authorized Admin Product Deletion ---
        console.log('\n👉 Case 5: Deleting product as ADMIN...');
        const resDelete = await fetch(`${API_ROOT}/admin/products/${testProductId}`, {
            method: 'DELETE',
            headers: { 
                Authorization: `Bearer ${adminToken}`
            }
        });
        
        const deleteData = await resDelete.json();
        console.log(`Status returned: ${resDelete.status} (Expected: 200)`);
        if (resDelete.status !== 200) {
            console.error('❌ FAILURE: Admin deletion failed:', deleteData);
            process.exit(1);
        }
        console.log('✅ PASS: Product successfully purged from database.', deleteData);

        console.log('\n✨ ALL E2E AUTOMATED CRUD SECURITY CHECKS PASSED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ E2E VERIFICATION CRASHED:', err.message);
        process.exit(1);
    }
}

runTests();
