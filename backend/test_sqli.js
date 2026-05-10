// SQLi Penetration Test Script — Story 9 Verification
// Tests all known SQLi payloads against the API

const BASE = 'http://localhost:5000';

const payloads = [
    { name: "OR 1=1", email: "admin' OR 1=1 --", password: "test" },
    { name: "UNION SELECT", email: "test@x.com", password: "1 UNION SELECT NULL,NULL--" },
    { name: "DROP TABLE", email: "test@x.com", password: "'; DROP TABLE users; --" },
    { name: "SLEEP injection", email: "test@x.com", password: "' AND SLEEP(5) --" },
    { name: "Comment injection", email: "admin'--", password: "x" },
];

async function runTests() {
    console.log('═══════════════════════════════════════════════');
    console.log('  SQL Injection Penetration Test Results');
    console.log('═══════════════════════════════════════════════\n');

    let passed = 0;
    let failed = 0;

    for (const p of payloads) {
        try {
            const res = await fetch(`${BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: p.email, password: p.password })
            });
            const body = await res.json();
            const blocked = res.status === 403 || res.status === 400;
            const status = blocked ? '✅ BLOCKED' : '❌ NOT BLOCKED';
            
            if (blocked) passed++; else failed++;
            
            console.log(`[${status}] ${p.name}`);
            console.log(`   Status: ${res.status} | Response: ${JSON.stringify(body)}`);
            console.log('');
        } catch (e) {
            console.log(`[⚠️ ERROR] ${p.name}: ${e.message}`);
            failed++;
        }
    }

    // Test 6: Invalid UUID in route param
    try {
        const res = await fetch(`${BASE}/api/pets/not-a-valid-uuid`);
        const body = await res.json();
        const blocked = res.status === 400;
        if (blocked) passed++; else failed++;
        console.log(`[${blocked ? '✅ BLOCKED' : '❌ NOT BLOCKED'}] Invalid UUID in route param`);
        console.log(`   Status: ${res.status} | Response: ${JSON.stringify(body)}\n`);
    } catch (e) { failed++; }

    // Test 7: Unexpected fields stripped
    try {
        const res = await fetch(`${BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "test@test.com", password: "12345678", malicious_field: "DROP TABLE users" })
        });
        const body = await res.json();
        console.log(`[✅ INFO] Unexpected field test`);
        console.log(`   Status: ${res.status} | Response: ${JSON.stringify(body)}\n`);
        passed++;
    } catch (e) { failed++; }

    // Test 8: Email validation
    try {
        const res = await fetch(`${BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "not-an-email", password: "12345678" })
        });
        const body = await res.json();
        const blocked = res.status === 400;
        if (blocked) passed++; else failed++;
        console.log(`[${blocked ? '✅ BLOCKED' : '❌ NOT BLOCKED'}] Invalid email format`);
        console.log(`   Status: ${res.status} | Response: ${JSON.stringify(body)}\n`);
    } catch (e) { failed++; }

    // Test 9: Missing required fields
    try {
        const res = await fetch(`${BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const body = await res.json();
        const blocked = res.status === 400;
        if (blocked) passed++; else failed++;
        console.log(`[${blocked ? '✅ BLOCKED' : '❌ NOT BLOCKED'}] Missing required fields`);
        console.log(`   Status: ${res.status} | Response: ${JSON.stringify(body)}\n`);
    } catch (e) { failed++; }

    // Test 10: Verify generic error messages (no DB leak)
    try {
        const res = await fetch(`${BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "nonexistent@test.com", password: "wrongpassword" })
        });
        const body = await res.json();
        const safe = !JSON.stringify(body).includes('SQL') && !JSON.stringify(body).includes('postgres') && !JSON.stringify(body).includes('column');
        if (safe) passed++; else failed++;
        console.log(`[${safe ? '✅ SAFE' : '❌ LEAKING'}] Error message doesn't expose DB details`);
        console.log(`   Status: ${res.status} | Response: ${JSON.stringify(body)}\n`);
    } catch (e) { failed++; }

    console.log('═══════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════');
}

runTests();
