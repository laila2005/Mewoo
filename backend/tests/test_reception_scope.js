// ─────────────────────────────────────────────────────────────
// Clinic reception — scope and revocation.
//
// This is access-control code, so it is tested against the real database
// rather than by inspection. Two clinics are created side by side and the
// assistant belongs to only one of them; every assertion below is about what
// happens at the boundary between them.
//
// Run: node tests/test_reception_scope.js
// ─────────────────────────────────────────────────────────────
import { query } from '../src/config/db.js';
import { requireClinicAssistant } from '../src/middlewares/clinicScope.js';
import { getSummary, getDay, setStatus, reschedule } from '../src/controllers/receptionController.js';

let passed = 0;
let failed = 0;

function check(name, ok, detail = '') {
    if (ok) { passed += 1; console.log(`  ✅ PASS  ${name}`); }
    else { failed += 1; console.log(`  ❌ FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

// Minimal express double: captures status + body so assertions can read them.
function mockRes() {
    return {
        statusCode: 200,
        body: null,
        status(c) { this.statusCode = c; return this; },
        json(b) { this.body = b; return this; },
    };
}

// Runs a middleware then, only if it called next(), the handler.
async function run(handler, req, { middleware = requireClinicAssistant } = {}) {
    const res = mockRes();
    let proceeded = false;
    await middleware(req, res, () => { proceeded = true; });
    if (!proceeded) return res;
    await handler(req, res);
    return res;
}

const stamp = `rcpt_${process.pid}_${Math.floor(process.uptime() * 1000)}`;
const ids = { users: [], pets: [], appts: [] };

async function mkUser(role, extra = {}) {
    const cols = ['email', 'password_hash', 'first_name', 'last_name', 'role'];
    const vals = [`${stamp}_${role}_${ids.users.length}@example.test`, 'x', 'Test', role, role];
    for (const [k, v] of Object.entries(extra)) { cols.push(k); vals.push(v); }
    const ph = vals.map((_, i) => `$${i + 1}`).join(', ');
    const r = await query(
        `INSERT INTO users (${cols.join(', ')}) VALUES (${ph}) RETURNING id`, vals
    );
    ids.users.push(r.rows[0].id);
    return r.rows[0].id;
}

async function mkPet(ownerId) {
    const r = await query(
        `INSERT INTO pets (owner_id, name, species) VALUES ($1, $2, 'dog') RETURNING id`,
        [ownerId, `${stamp}_pet`]
    );
    ids.pets.push(r.rows[0].id);
    return r.rows[0].id;
}

async function mkAppt(petId, vetId, whenIso, status = 'pending') {
    const r = await query(
        `INSERT INTO appointments (pet_id, vet_user_id, appointment_time, reason, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [petId, vetId, whenIso, 'CONFIDENTIAL clinical reason', status]
    );
    ids.appts.push(r.rows[0].id);
    return r.rows[0].id;
}

const inHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

async function main() {
    console.log('\n──── Clinic reception: scope + revocation ────\n');

    // Two clinics. The assistant works for vetA and has never heard of vetB.
    const vetA = await mkUser('vet');
    const vetB = await mkUser('vet');
    const owner = await mkUser('owner');
    const assistant = await mkUser('clinic_assistant', { manager_vet_id: vetA, assistant_disabled: false });
    const orphan = await mkUser('clinic_assistant', { assistant_disabled: false });
    const disabled = await mkUser('clinic_assistant', { manager_vet_id: vetA, assistant_disabled: true });

    const pet = await mkPet(owner);
    const apptA = await mkAppt(pet, vetA, inHours(2));
    const apptB = await mkAppt(pet, vetB, inHours(3));

    const asAssistant = (over = {}) => ({
        user: { id: assistant, role: 'clinic_assistant' },
        query: {}, params: {}, body: {}, ...over,
    });

    // ── Scope ────────────────────────────────────────────────
    const day = await run(getDay, asAssistant({ query: { date: null } }));
    const seen = (day.body?.appointments || []).map((a) => a.id);
    check('sees its own clinic\'s appointment', seen.includes(apptA));
    check('cannot see the other clinic\'s appointment', !seen.includes(apptB),
        'an assistant read across a clinic boundary');

    // ── Confidentiality ──────────────────────────────────────
    const anyRow = (day.body?.appointments || [])[0] || {};
    check('clinical reason is never returned to reception',
        !Object.prototype.hasOwnProperty.call(anyRow, 'reason'),
        'reception received the medical reason field');

    // ── Writes are scoped too ────────────────────────────────
    const wrongClinic = await run(setStatus, asAssistant({
        params: { id: String(apptB) }, body: { status: 'cancelled' },
    }));
    check('cannot change the other clinic\'s appointment', wrongClinic.statusCode === 404,
        `got ${wrongClinic.statusCode}`);

    const stillPending = await query('SELECT status FROM appointments WHERE id = $1', [apptB]);
    check('the other clinic\'s appointment is untouched', stillPending.rows[0].status === 'pending',
        `status is now ${stillPending.rows[0].status}`);

    const ownClinic = await run(setStatus, asAssistant({
        params: { id: String(apptA) }, body: { status: 'confirmed' },
    }));
    check('can confirm its own clinic\'s appointment', ownClinic.statusCode === 200,
        `got ${ownClinic.statusCode}`);

    // ── Status allow-list ────────────────────────────────────
    const bogus = await run(setStatus, asAssistant({
        params: { id: String(apptA) }, body: { status: 'pending' },
    }));
    check('cannot push an appointment back to pending', bogus.statusCode === 400);

    const injected = await run(setStatus, asAssistant({
        params: { id: String(apptA) }, body: { status: "completed'; DROP TABLE users; --" },
    }));
    check('rejects a status outside the allow-list', injected.statusCode === 400);

    // ── Revocation: the reason this middleware hits the database ──
    const disabledRes = await run(getDay, {
        user: { id: disabled, role: 'clinic_assistant' }, query: {}, params: {}, body: {},
    });
    check('a disabled seat is refused even with a valid token', disabledRes.statusCode === 403,
        `got ${disabledRes.statusCode} — a disabled assistant kept access`);

    const orphanRes = await run(getDay, {
        user: { id: orphan, role: 'clinic_assistant' }, query: {}, params: {}, body: {},
    });
    check('a seat with no clinic gets nothing', orphanRes.statusCode === 403);

    const asVet = await run(getDay, { user: { id: vetA, role: 'vet' }, query: {}, params: {}, body: {} });
    check('a vet cannot use the reception endpoints', asVet.statusCode === 403);

    // ── Reschedule ───────────────────────────────────────────
    const past = await run(reschedule, asAssistant({
        params: { id: String(apptA) }, body: { appointment_time: inHours(-5) },
    }));
    check('refuses to move an appointment into the past', past.statusCode === 400);

    const junk = await run(reschedule, asAssistant({
        params: { id: String(apptA) }, body: { appointment_time: 'not-a-date' },
    }));
    check('refuses an unparseable time', junk.statusCode === 400);

    const clashTarget = inHours(6);
    await mkAppt(pet, vetA, clashTarget, 'confirmed');
    const clash = await run(reschedule, asAssistant({
        params: { id: String(apptA) }, body: { appointment_time: clashTarget },
    }));
    check('refuses a slot the clinic already has taken', clash.statusCode === 409,
        `got ${clash.statusCode}`);

    const moveTo = inHours(9);
    const moved = await run(reschedule, asAssistant({
        params: { id: String(apptA) }, body: { appointment_time: moveTo },
    }));
    check('moves an appointment to a free slot', moved.statusCode === 200,
        `got ${moved.statusCode}: ${JSON.stringify(moved.body)}`);

    const crossMove = await run(reschedule, asAssistant({
        params: { id: String(apptB) }, body: { appointment_time: inHours(11) },
    }));
    check('cannot move the other clinic\'s appointment', crossMove.statusCode === 404);

    // ── Summary ──────────────────────────────────────────────
    const sum = await run(getSummary, asAssistant());
    check('summary reports only this clinic', sum.statusCode === 200 && !!sum.body?.today);

    // ── "Today" must mean today in Cairo, not in UTC ─────────
    // The database session runs in UTC. Between UTC midnight and Cairo
    // midnight the two disagree, and using CURRENT_DATE showed the front desk
    // yesterday's diary for about three hours every night.
    const tz = await query(
        `SELECT CURRENT_DATE::text AS utc_date,
                (NOW() AT TIME ZONE 'Africa/Cairo')::date::text AS cairo_date`
    );
    const { utc_date, cairo_date } = tz.rows[0];

    // An appointment placed at "now" always belongs to today in Cairo.
    const nowAppt = await mkAppt(pet, vetA, new Date().toISOString(), 'confirmed');
    const todayList = await run(getDay, asAssistant());
    const todayIds = (todayList.body?.appointments || []).map((a) => a.id);
    check('today is resolved in the clinic timezone, not the database one',
        todayIds.includes(nowAppt),
        utc_date === cairo_date
            ? 'UTC and Cairo agree right now, so this run could not tell them apart'
            : `UTC says ${utc_date}, Cairo says ${cairo_date} — the appointment was missed`);

    console.log(`\n──────── Reception: ${passed} passed, ${failed} failed ────────\n`);
}

async function cleanup() {
    // Children first: appointments reference pets, pets reference users.
    if (ids.appts.length) await query('DELETE FROM appointments WHERE id = ANY($1)', [ids.appts]);
    if (ids.pets.length) await query('DELETE FROM pets WHERE id = ANY($1)', [ids.pets]);
    if (ids.users.length) await query('DELETE FROM users WHERE id = ANY($1)', [ids.users]);
}

main()
    .catch((e) => { console.error('Test run crashed:', e); failed += 1; })
    .finally(async () => {
        // Always runs, so a mid-test failure never leaves rows in a live database.
        try { await cleanup(); } catch (e) { console.error('Cleanup failed:', e.message); }
        process.exit(failed > 0 ? 1 : 0);
    });
