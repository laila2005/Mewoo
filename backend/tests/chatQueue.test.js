/**
 * PetPluse — VetAI concurrency gate tests.
 *
 * These run against the real database (the gate's whole point is coordinating
 * across separate Postgres connections, which is exactly what a burst of
 * concurrent chat requests looks like) rather than mocking it — a mock would
 * hide precisely the race conditions this module exists to avoid.
 *
 * Usage:  node tests/chatQueue.test.js
 */
import dotenv from 'dotenv';
dotenv.config();
import { query } from '../src/config/db.js';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✅ PASS  ${name}`); }
  else { fail++; console.log(`  ❌ FAIL  ${name} ${detail}`); }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Every test resets the gate to empty, so one failing case can't cascade. */
async function resetGate() {
  await query('DELETE FROM ai_chat_queue');
  await query('DELETE FROM ai_chat_slots');
  await query('UPDATE ai_chat_gate SET in_flight = 0 WHERE id = 1');
}

async function gateState() {
  const g = (await query('SELECT in_flight FROM ai_chat_gate WHERE id = 1')).rows[0];
  const q = (await query('SELECT COUNT(*)::int AS n FROM ai_chat_queue')).rows[0];
  const s = (await query('SELECT COUNT(*)::int AS n FROM ai_chat_slots')).rows[0];
  return { inFlight: g.in_flight, queued: q.n, slots: s.n };
}

// Re-import with fresh env per scenario: the module reads MAX_CONCURRENT /
// MAX_WAIT_MS once at import time, so each scenario that needs a different
// value gets its own cache-busted import.
let seq = 0;
async function freshQueue(envOverrides) {
  Object.assign(process.env, envOverrides);
  const mod = await import(`../src/ai/chatQueue.js?t=${Date.now()}_${seq++}`);
  return mod;
}

async function run() {
  console.log('\n── ceiling holds under real concurrency ──');
  await resetGate();
  {
    const { waitForTurn } = await freshQueue({ AI_CHAT_MAX_CONCURRENT: '2', AI_CHAT_MAX_WAIT_MS: '8000' });

    // 10 callers arrive at effectively the same instant — the scenario the
    // gate exists for. Track the peak number simultaneously granted.
    let concurrentNow = 0, peak = 0;
    const holdMs = 500;
    const outcomes = await Promise.all(
      Array.from({ length: 10 }, () =>
        waitForTurn().then(async (r) => {
          if (!r.granted) return { granted: false };
          concurrentNow++;
          peak = Math.max(peak, concurrentNow);
          await sleep(holdMs); // simulate the actual model call taking time
          concurrentNow--;
          await r.release();
          return { granted: true };
        })
      )
    );

    check('peak concurrent grants never exceeded the ceiling', peak <= 2, `→ peak was ${peak}`);
    check('every one of the 10 callers eventually got an answer',
      outcomes.every((o) => o.granted), `→ ${outcomes.filter((o) => !o.granted).length} timed out`);

    const after = await gateState();
    check('gate returns to a clean rest state after the burst',
      after.inFlight === 0 && after.queued === 0 && after.slots === 0,
      `→ ${JSON.stringify(after)}`);
  }

  console.log('\n── first-arrived is first-served ──');
  await resetGate();
  {
    const { waitForTurn } = await freshQueue({ AI_CHAT_MAX_CONCURRENT: '1', AI_CHAT_MAX_WAIT_MS: '8000' });

    const order = [];
    const started = [];
    // Stagger arrival slightly so ticket order is deterministic, then confirm
    // grants come out in that same order despite all three racing for one slot.
    const callers = [0, 1, 2].map((i) => (async () => {
      await sleep(i * 60);
      started.push(i);
      const r = await waitForTurn();
      if (r.granted) {
        order.push(i);
        await sleep(200);
        await r.release();
      }
      return r.granted;
    })());
    const results = await Promise.all(callers);

    check('all three were granted a turn', results.every(Boolean), `→ ${JSON.stringify(results)}`);
    check('grants happened in arrival order', JSON.stringify(order) === JSON.stringify([0, 1, 2]),
      `→ granted in order ${JSON.stringify(order)}, arrived in order ${JSON.stringify(started)}`);
  }

  console.log('\n── a busy gate degrades to "please fall back", not a hang ──');
  await resetGate();
  {
    const { waitForTurn } = await freshQueue({ AI_CHAT_MAX_CONCURRENT: '1', AI_CHAT_MAX_WAIT_MS: '1200' });

    // Occupy the only slot for longer than the second caller is willing to wait.
    const holder = await waitForTurn();
    check('the holder got the slot', holder.granted);

    const t0 = Date.now();
    const second = await waitForTurn();
    const waited = Date.now() - t0;

    check('the second caller gives up rather than hanging forever', second.granted === false);
    check('it gave up close to its own timeout, not early and not much late',
      waited >= 1100 && waited <= 2200, `→ waited ${waited}ms for a 1200ms budget`);

    const whileHolderStillHolds = await gateState();
    check('the timed-out caller left no queue residue, and the holder still holds its slot',
      whileHolderStillHolds.queued === 0 && whileHolderStillHolds.slots === 1,
      `→ ${JSON.stringify(whileHolderStillHolds)}`);

    await holder.release();
  }
  await resetGate();

  console.log('\n── a crashed holder\'s slot is reclaimed, not lost forever ──');
  {
    const { waitForTurn } = await freshQueue({ AI_CHAT_MAX_CONCURRENT: '1', AI_CHAT_MAX_WAIT_MS: '6000' });

    // Simulate a request that claimed a slot and then crashed before ever
    // calling release() — insert the slot row directly, back-dated past the
    // staleness window, exactly as an abandoned holder would look.
    await query(`INSERT INTO ai_chat_queue DEFAULT VALUES`); // keeps MIN(id) logic sane
    await query(`UPDATE ai_chat_gate SET in_flight = 1 WHERE id = 1`);
    await query(`INSERT INTO ai_chat_slots (ticket_id, claimed_at)
                 VALUES (999999999, NOW() - INTERVAL '5 minutes')`);
    await query(`DELETE FROM ai_chat_queue`); // the "crashed" caller's own ticket is long gone too

    const t0 = Date.now();
    const r = await waitForTurn();
    const waited = Date.now() - t0;

    check('a fresh caller is granted the reclaimed slot', r.granted);
    check('reclaiming happened quickly, not after waiting out the full timeout',
      waited < 3000, `→ took ${waited}ms`);

    if (r.granted) await r.release();
    const after = await gateState();
    check('state is clean after the reclaimed slot is released',
      after.inFlight === 0 && after.slots === 0, `→ ${JSON.stringify(after)}`);
  }

  console.log(`\n${fail === 0 ? '✅' : '❌'} chatQueue: ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error('Test run crashed:', e);
  process.exit(1);
});
