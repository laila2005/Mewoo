/**
 * PetPluse — regression checks for the concurrency/transaction fixes made in
 * response to a code review of the trainer/clinic-wallet feature work:
 *   - enrollInProgram: capacity race (two concurrent enrollments into a
 *     capacity=1 program must not both become 'active')
 *   - cancelEnrollment: waitlist-promotion race (two concurrent cancellations
 *     freeing two seats must promote two DISTINCT waitlisted enrollments, not
 *     double-promote one and starve the other)
 *   - clinicWalletController: getWallet/depositToWallet must 403 when the
 *     'vets' feature flag is off, matching bookingController's gate
 *
 * Runs against the real database (this is what the bugs were about — two
 * separate Postgres connections racing each other), using clearly-marked
 * throwaway rows that are deleted in a `finally` block.
 *
 * Usage:  node tests/test_review_fixes.js
 */
import dotenv from 'dotenv';
dotenv.config();
import { query } from '../src/config/db.js';
import { invalidateFlagsCache } from '../src/config/featureFlags.js';
import { enrollInProgram, cancelEnrollment } from '../src/controllers/trainingProgramController.js';
import { getWallet, depositToWallet } from '../src/controllers/clinicWalletController.js';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✅ PASS  ${name}`); }
  else { fail++; console.log(`  ❌ FAIL  ${name} ${detail}`); }
};

const TAG = 'review_fix_test';
const email = (who) => `${TAG}_${who}@petpluse.invalid`;

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function makeUser(role, who) {
  const { rows } = await query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'x', $4) RETURNING id`,
    [TAG, who, email(who), role]
  );
  return rows[0].id;
}

async function cleanup() {
  await query(`DELETE FROM program_enrollments WHERE program_id IN (SELECT id FROM training_programs WHERE title LIKE $1)`, [`${TAG}%`]);
  await query(`DELETE FROM training_programs WHERE title LIKE $1`, [`${TAG}%`]);
  await query(`DELETE FROM clinic_wallet_transactions WHERE wallet_id IN (SELECT id FROM clinic_wallets WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1))`, [`${TAG}%`]);
  await query(`DELETE FROM clinic_wallets WHERE owner_id IN (SELECT id FROM users WHERE email LIKE $1)`, [`${TAG}%`]);
  await query(`DELETE FROM users WHERE email LIKE $1`, [`${TAG}%`]);
}

async function testEnrollmentCapacityRace() {
  console.log('\n── enrollInProgram: two concurrent enrollments into a capacity=1 program ──');
  const trainerId = await makeUser('trainer', 'trainer1');
  const owner1 = await makeUser('owner', 'owner1');
  const owner2 = await makeUser('owner', 'owner2');

  const { rows } = await query(
    `INSERT INTO training_programs (trainer_id, title, price, capacity, status)
     VALUES ($1, $2, 10, 1, 'active') RETURNING id`,
    [trainerId, `${TAG} capacity program`]
  );
  const programId = rows[0].id;

  const res1 = mockRes();
  const res2 = mockRes();
  await Promise.all([
    enrollInProgram({ user: { id: owner1 }, params: { id: programId }, body: {} }, res1),
    enrollInProgram({ user: { id: owner2 }, params: { id: programId }, body: {} }, res2),
  ]);

  const statuses = [res1.body?.enrollment?.status, res2.body?.enrollment?.status].sort();
  check('both requests succeeded (201)', res1.statusCode === 201 && res2.statusCode === 201, JSON.stringify({ s1: res1.statusCode, s2: res2.statusCode, b1: res1.body, b2: res2.body }));
  check('exactly one active and one waitlisted — no double-booking of the single seat', JSON.stringify(statuses) === JSON.stringify(['active', 'waitlisted']), JSON.stringify(statuses));

  const dbCount = await query(`SELECT status, COUNT(*)::int AS n FROM program_enrollments WHERE program_id = $1 GROUP BY status`, [programId]);
  const activeCount = dbCount.rows.find(r => r.status === 'active')?.n || 0;
  check('database agrees: exactly one active row', activeCount === 1, JSON.stringify(dbCount.rows));
}

async function testCancellationPromotionRace() {
  console.log('\n── cancelEnrollment: two concurrent cancellations must promote two DISTINCT waitlisted enrollments ──');
  const trainerId = await makeUser('trainer', 'trainer2');
  const ownerA = await makeUser('owner', 'ownerA');
  const ownerB = await makeUser('owner', 'ownerB');
  const ownerC = await makeUser('owner', 'ownerC');
  const ownerD = await makeUser('owner', 'ownerD');

  const { rows } = await query(
    `INSERT INTO training_programs (trainer_id, title, price, capacity, status)
     VALUES ($1, $2, 10, 2, 'active') RETURNING id`,
    [trainerId, `${TAG} promotion program`]
  );
  const programId = rows[0].id;

  const enrollActive = async (ownerId) => (await query(
    `INSERT INTO program_enrollments (program_id, owner_id, status, enrolled_at) VALUES ($1, $2, 'active', now()) RETURNING id`,
    [programId, ownerId]
  )).rows[0].id;
  const enrollWaitlisted = async (ownerId, offsetSeconds) => (await query(
    `INSERT INTO program_enrollments (program_id, owner_id, status, enrolled_at) VALUES ($1, $2, 'waitlisted', now() + ($3 || ' seconds')::interval) RETURNING id`,
    [programId, ownerId, offsetSeconds]
  )).rows[0].id;

  const enrollmentA = await enrollActive(ownerA);
  const enrollmentB = await enrollActive(ownerB);
  const enrollmentC = await enrollWaitlisted(ownerC, 0);
  const enrollmentD = await enrollWaitlisted(ownerD, 1);

  const resA = mockRes();
  const resB = mockRes();
  await Promise.all([
    cancelEnrollment({ user: { id: ownerA }, params: { id: enrollmentA } }, resA),
    cancelEnrollment({ user: { id: ownerB }, params: { id: enrollmentB } }, resB),
  ]);

  check('both cancellations succeeded (200)', resA.statusCode === 200 && resB.statusCode === 200, JSON.stringify({ a: resA.body, b: resB.body }));

  const final = await query(`SELECT id, status FROM program_enrollments WHERE id IN ($1, $2, $3, $4)`, [enrollmentA, enrollmentB, enrollmentC, enrollmentD]);
  const byId = Object.fromEntries(final.rows.map(r => [r.id, r.status]));
  const activeAfter = final.rows.filter(r => r.status === 'active').length;
  const waitlistedAfter = final.rows.filter(r => r.status === 'waitlisted').length;

  check('both original seats show cancelled', byId[enrollmentA] === 'cancelled' && byId[enrollmentB] === 'cancelled', JSON.stringify(byId));
  check('both waitlisted enrollments were promoted — none lost to a duplicate promotion', activeAfter === 2, `active=${activeAfter} ${JSON.stringify(byId)}`);
  check('no enrollment left stuck on the waitlist', waitlistedAfter === 0, `waitlisted=${waitlistedAfter} ${JSON.stringify(byId)}`);
}

async function testWalletFeatureGate() {
  console.log('\n── clinicWalletController: gated behind the \'vets\' soft-launch flag ──');
  const vetId = await makeUser('vet', 'vet1');
  const owner = await makeUser('owner', 'walletowner');

  // This is the SAME row the admin panel's real soft-launch toggles live in
  // (marketplace/subscriptions/etc may already be flipped off) — read and
  // restore it verbatim rather than assuming a shape, so this test can never
  // leave the live gate in a different state than it found it.
  const before = await query(`SELECT value FROM platform_settings WHERE key = 'feature_flags'`);
  const hadRow = before.rows.length > 0;
  const originalValue = hadRow ? before.rows[0].value : null;
  const originalFlags = hadRow ? (typeof originalValue === 'string' ? JSON.parse(originalValue) : originalValue) : {};

  try {
    await query(
      `INSERT INTO platform_settings (key, value) VALUES ('feature_flags', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify({ ...originalFlags, vets: false })]
    );
    invalidateFlagsCache();

    const resGetGated = mockRes();
    await getWallet({ user: { id: owner }, params: { vetId } }, resGetGated);
    check('getWallet returns 403 while vets is gated', resGetGated.statusCode === 403, JSON.stringify(resGetGated.body));

    const resDepositGated = mockRes();
    await depositToWallet({ user: { id: owner }, params: { vetId }, body: { amount: 50 } }, resDepositGated);
    check('depositToWallet returns 403 while vets is gated', resDepositGated.statusCode === 403, JSON.stringify(resDepositGated.body));

    await query(`UPDATE platform_settings SET value = $1 WHERE key = 'feature_flags'`, [JSON.stringify({ ...originalFlags, vets: true })]);
    invalidateFlagsCache();

    const resDepositLive = mockRes();
    await depositToWallet({ user: { id: owner }, params: { vetId }, body: { amount: 50 } }, resDepositLive);
    check('depositToWallet succeeds once vets is live', resDepositLive.statusCode === 200 && Number(resDepositLive.body?.balance) === 50, JSON.stringify(resDepositLive.body));

    const resGetLive = mockRes();
    await getWallet({ user: { id: owner }, params: { vetId } }, resGetLive);
    check('getWallet succeeds once vets is live', resGetLive.statusCode === 200 && Number(resGetLive.body?.balance) === 50, JSON.stringify(resGetLive.body));
  } finally {
    if (hadRow) {
      await query(`UPDATE platform_settings SET value = $1 WHERE key = 'feature_flags'`, [JSON.stringify(originalFlags)]);
    } else {
      await query(`DELETE FROM platform_settings WHERE key = 'feature_flags'`);
    }
    invalidateFlagsCache();
  }
}

async function main() {
  try {
    await cleanup();
    await testEnrollmentCapacityRace();
    await testCancellationPromotionRace();
    await testWalletFeatureGate();
  } finally {
    await cleanup();
  }
  console.log(`\n${fail === 0 ? '✅' : '❌'} review-fixes: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('Test run crashed:', e);
  process.exit(1);
});
