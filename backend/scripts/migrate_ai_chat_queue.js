/**
 * PetPluse — VetAI concurrency gate.
 *
 * Groq's free tier meters tokens per API key, per minute — not per user. At
 * roughly 1,900 fixed tokens per turn against a 6,000 TPM ceiling, the whole
 * platform has room for about three turns a minute, combined. Two or three
 * customers messaging VetAI in the same moment can exceed that shared budget
 * even though each of them is nowhere near their own per-user rate limit,
 * which is why "multiple customers messaging at once" surfaced as VetAI being
 * "down" rather than one abusive account being throttled.
 *
 * There is no in-process fix for this: Vercel gives every concurrent request
 * its own memory-isolated serverless instance, so a JavaScript counter in one
 * instance cannot see a request being handled by another. Postgres is the one
 * thing every instance already shares, so the gate lives there. No Redis, no
 * new infrastructure: `redis` is a listed dependency in this project that is
 * imported nowhere and has no configured URL — introducing it for this would
 * be new infrastructure for a problem Postgres already solves.
 *
 * Three small tables, each doing one job:
 *
 *   ai_chat_gate     A single counter row. `in_flight` is the true, atomic
 *                    concurrency ceiling: Postgres serializes concurrent
 *                    UPDATEs to the SAME row via ordinary row-level locking,
 *                    so `in_flight < max` is never read stale by a second
 *                    writer the way an application-level counter would be.
 *
 *   ai_chat_queue    One row per request waiting for a turn, ordered by a
 *                    bigserial arrival id, so a waiter can be told "you're
 *                    #2" and only attempts to claim a slot once it is the
 *                    oldest ticket still waiting.
 *
 *   ai_chat_slots    One row per request CURRENTLY holding a slot, with the
 *                    moment it claimed it. This is what makes stale-slot
 *                    reaping correct: a long queue is normal and must never
 *                    be mistaken for an abandoned slot, so staleness is
 *                    judged against real per-holder claim timestamps, not
 *                    queue depth. If an instance crashes mid-generation, its
 *                    slot's row simply stops being renewed and ages out.
 *
 * Claim and release each touch the gate counter and a slot row together in
 * ONE statement (a data-modifying CTE), so the counter can never drift from
 * the real set of held slots — every increment is paired with the insert
 * that justifies it, every decrement with the delete that frees it.
 *
 * Usage:  node scripts/migrate_ai_chat_queue.js
 */
import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const run = async () => {
  await client.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_gate (
        id        SMALLINT PRIMARY KEY DEFAULT 1,
        in_flight INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT ai_chat_gate_singleton CHECK (id = 1),
        CONSTRAINT ai_chat_gate_non_negative CHECK (in_flight >= 0)
      )`);
    await client.query(`
      INSERT INTO ai_chat_gate (id, in_flight) VALUES (1, 0)
      ON CONFLICT (id) DO NOTHING`);
    console.log('✅ ai_chat_gate (the counter row)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_queue (
        id         BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await client.query(`CREATE INDEX IF NOT EXISTS ai_chat_queue_id_idx ON ai_chat_queue (id)`);
    console.log('✅ ai_chat_queue (the waiting line)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_slots (
        ticket_id  BIGINT PRIMARY KEY,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await client.query(`CREATE INDEX IF NOT EXISTS ai_chat_slots_claimed_at_idx ON ai_chat_slots (claimed_at)`);
    console.log('✅ ai_chat_slots (who actually holds a slot, and since when)');

    await client.query('COMMIT');
    console.log('\n🎉 VetAI concurrency gate migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ migration rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

run();
