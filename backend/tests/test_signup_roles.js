// ─────────────────────────────────────────────────────────────
// Signup regression — every role, and the rate limit that made three of
// them look broken.
//
// Professional signup (vet / trainer / vendor) appeared broken while owner
// signup appeared fine. The cause was not the roles: the register limiter
// allowed 5 requests per 15 minutes per IP and counted every one, including
// attempts rejected for a weak password. Onboarding does the professional
// roles back-to-back, so those are the ones that hit the wall.
//
// Needs the API running:  npm --prefix backend run dev
// Run:                    node tests/test_signup_roles.js
// ─────────────────────────────────────────────────────────────
import { query } from '../src/config/db.js';

const BASE = process.env.TEST_BASE || 'http://127.0.0.1:5000/api';
const stamp = `sgnreg_${Date.now()}`;
const made = [];

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
    if (ok) { passed += 1; console.log(`  ✅ PASS  ${name}`); }
    else { failed += 1; console.log(`  ❌ FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

// A genuine tiny JPEG, so the signature sniffer accepts it as a real image.
const JPEG = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
    'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
    'base64'
);

const register = async (fields, { withFile = false } = {}) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    if (withFile) fd.append('national_id', new Blob([JPEG], { type: 'image/jpeg' }), 'id.jpg');
    const res = await fetch(`${BASE}/auth/register`, { method: 'POST', body: fd });
    let body = null;
    try { body = await res.json(); } catch { /* non-json */ }
    if (res.status === 201 && fields.email) made.push(fields.email);
    return { status: res.status, body };
};

const base = (role, n) => ({
    email: `${stamp}_${role}${n}@example.test`,
    password: 'Testing!2345',
    first_name: 'Reg',
    last_name: role,
    role,
});

const ROLES = {
    owner: {},
    // Unique per run: vet_profiles.license_number really is UNIQUE, so a fixed
    // value here would collide with the previous run and with itself.
    vet: { clinic_name: 'Reg Clinic', license_number: `LIC-${stamp}-A`, specialties: 'surgery' },
    trainer: { specialties: 'obedience,agility' },
    vendor: { shop_name: 'Reg Shop', shop_category: 'Food', business_address: '1 St', tax_id: 'TX' },
};

const main = async () => {
    // The limiter counts successful creations in memory for 15 minutes, so a
    // second run against the same warm server will exhaust it and every
    // assertion below turns into a confusing 429. Say so once, up front,
    // instead of reporting nine unrelated failures.
    const probe = await fetch(`${BASE}/auth/register`, { method: 'POST', body: new FormData() });
    if (probe.status === 429) {
        console.error('\n  This server has already hit the registration limit for this window.');
        console.error('  Restart the API (it resets the in-memory counter) and run again,');
        console.error('  or start it with REGISTER_RATE_LIMIT_MAX=200.\n');
        failed += 1;
        return;
    }

    console.log('\n──── Signup: every role ────\n');

    // ── each role registers, and lands with the right profile row ──
    for (const [role, extra] of Object.entries(ROLES)) {
        const r = await register({ ...base(role, 0), ...extra });
        check(`${role} can register`, r.status === 201,
            `${r.status} ${JSON.stringify(r.body).slice(0, 140)}`);
        check(`${role} gets a token and the right role`,
            r.body?.token && r.body?.user?.role === role,
            `role came back as ${r.body?.user?.role}`);
    }

    // ── the professional roles must actually get their profile row ──
    const profileFor = {
        vet: ['vet_profiles', 'user_id'],
        trainer: ['trainer_profiles', 'user_id'],
        vendor: ['pet_shops', 'owner_id'],
    };
    for (const [role, [table, col]] of Object.entries(profileFor)) {
        const u = await query('SELECT id FROM users WHERE email = $1', [`${stamp}_${role}0@example.test`]);
        if (!u.rows[0]) { check(`${role} profile row created`, false, 'user row missing'); continue; }
        const p = await query(`SELECT 1 FROM ${table} WHERE ${col} = $1`, [u.rows[0].id]);
        check(`${role} profile row created in ${table}`, p.rowCount === 1);
    }

    // ── with an ID document attached: the path only professionals take ──
    const withDoc = await register(
        { ...base('vet', 1), ...ROLES.vet, license_number: `LIC-${stamp}-B` },
        { withFile: true }
    );
    check('vet can register with an ID document attached', withDoc.status === 201,
        `${withDoc.status} ${JSON.stringify(withDoc.body).slice(0, 140)}`);

    console.log('\n──── Duplicate details must say what clashed ────\n');

    // A vet whose licence number is already registered used to get a generic
    // 500 telling them to "please try again" — which never worked, and gave
    // them nothing to act on.
    const dupLicence = await register({
        ...base('vet', 3), ...ROLES.vet, license_number: `LIC-${stamp}-A`,
    });
    check('a duplicate licence number returns 409, not 500', dupLicence.status === 409,
        `${dupLicence.status} ${JSON.stringify(dupLicence.body).slice(0, 160)}`);
    check('and the message names the licence',
        /licence number/i.test(dupLicence.body?.error || ''),
        `message was: ${dupLicence.body?.error}`);

    // The rolled-back account must not linger, or the person can never retry.
    const orphan = await query('SELECT 1 FROM users WHERE email = $1',
        [`${stamp}_vet3@example.test`]);
    check('the failed signup leaves no orphaned account', orphan.rowCount === 0);

    console.log('\n──── Rate limit: rejected attempts must not lock anyone out ────\n');

    // Six attempts that all fail validation. Under the old limiter these
    // consumed the entire 5-per-window quota and the next honest signup was
    // refused; they should now cost nothing.
    let allRejected = true;
    for (let i = 0; i < 6; i++) {
        const bad = await register({ ...base('owner', 90 + i), password: 'weak' });
        if (bad.status !== 400) allRejected = false;
    }
    check('a weak password is rejected, not rate-limited', allRejected,
        'expected 400 for every weak-password attempt');

    const after = await register({ ...base('owner', 2) });
    check('an honest signup still works after six failed attempts',
        after.status === 201,
        `${after.status} ${JSON.stringify(after.body).slice(0, 160)}`);

    console.log(`\n──────── Signup: ${passed} passed, ${failed} failed ────────\n`);
};

const cleanup = async () => {
    const ids = await query('SELECT id FROM users WHERE email = ANY($1)', [made]);
    const list = ids.rows.map((r) => r.id);
    if (!list.length) return;
    // Children first — a professional account owns a profile row.
    await query('DELETE FROM pet_shops WHERE owner_id = ANY($1)', [list]);
    await query('DELETE FROM vet_profiles WHERE user_id = ANY($1)', [list]);
    await query('DELETE FROM trainer_profiles WHERE user_id = ANY($1)', [list]);
    await query('DELETE FROM users WHERE id = ANY($1)', [list]);
};

main()
    .catch((e) => { console.error('Test run crashed:', e.message); failed += 1; })
    .finally(async () => {
        try { await cleanup(); } catch (e) { console.error('Cleanup failed:', e.message); }
        process.exit(failed > 0 ? 1 : 0);
    });
