import { query } from '../config/db.js';

/**
 * PetPluse — VetAI concurrency gate.
 *
 * Gates ONLY the two call sites that actually spend Groq's shared,
 * account-wide token-per-minute budget (generateAIResponse / streamAIResponse
 * in aiChatController.js). Every deterministic branch — the emergency
 * guardrail, toxic-medication warnings, booking, cancel/reschedule, capability
 * questions — answers directly without a model call and must never wait on
 * this gate, emergency least of all.
 *
 * See backend/scripts/migrate_ai_chat_queue.js for the three-table shape and
 * why this lives in Postgres rather than in-process memory or Redis.
 */

// Conservative on purpose. 6,000 TPM / ~1,900 tokens-per-turn leaves room for
// about three concurrent turns platform-wide; two concurrent model calls
// leaves real margin rather than dialing the shared budget to its edge.
const MAX_CONCURRENT = Number(process.env.AI_CHAT_MAX_CONCURRENT) || 2;

// A request waits at most this long for a slot before giving up and taking
// the RAG-fallback path instead of a full agentic answer. Bounded well under
// any serverless function's duration ceiling — including Vercel Hobby's,
// which is the tightest this project runs on — so a busy queue degrades to a
// grounded knowledge-base answer rather than the platform itself killing the
// function and reproducing "AI is down" one layer up.
const MAX_WAIT_MS = Number(process.env.AI_CHAT_MAX_WAIT_MS) || 45_000;
const POLL_MS = 700;

// A held slot nobody comes back for (the holding instance crashed, or Groq
// itself hung) must not permanently shrink the gate. Judged against the real
// claim timestamp in ai_chat_slots, never against how long anyone has been
// queued — a long queue is normal and is not evidence of an abandoned slot.
const STALE_SLOT_MS = 90_000;

/**
 * Free any slot whose holder has not released it within STALE_SLOT_MS.
 * Counter and slot rows are decremented/deleted in one statement, so a
 * partial reap (freeing the row but not the counter, or vice versa) is not
 * possible — the two can never drift apart.
 */
async function reapStaleSlots() {
  await query(
    `WITH dead AS (
       DELETE FROM ai_chat_slots
        WHERE claimed_at < NOW() - ($1 || ' milliseconds')::interval
        RETURNING 1
     )
     UPDATE ai_chat_gate
        SET in_flight = GREATEST(0, in_flight - (SELECT COUNT(*) FROM dead))
      WHERE id = 1`,
    [STALE_SLOT_MS]
  );
}

/**
 * Try to take a slot, but only once `ticketId` is the oldest ticket still
 * waiting — so a slot freed while several requests are queued goes to
 * whoever arrived first, not whoever's poll happened to land first.
 *
 * One statement: the UPDATE's row lock on the single gate row is what makes
 * the concurrency ceiling correct under real concurrent access (two
 * candidate claims from two different serverless instances cannot both read
 * `in_flight < max` as true and both proceed, because they contend for a
 * lock on the same row rather than independently counting rows in a table).
 * The INSERT only happens at all if that UPDATE actually matched a row.
 */
async function tryClaim(ticketId, maxConcurrent) {
  const { rows } = await query(
    `WITH bump AS (
       UPDATE ai_chat_gate
          SET in_flight = in_flight + 1
        WHERE id = 1
          AND in_flight < $1
          AND $2 = (SELECT MIN(id) FROM ai_chat_queue)
        RETURNING 1
     )
     INSERT INTO ai_chat_slots (ticket_id)
     SELECT $2 FROM bump
     RETURNING ticket_id`,
    [maxConcurrent, ticketId]
  );
  return rows.length > 0;
}

/** Release a held slot. Safe to call more than once for the same ticket —
 *  only the first call finds a row to delete, so the counter is decremented
 *  exactly once no matter how release is triggered. */
async function releaseSlot(ticketId) {
  await query(
    `WITH removed AS (
       DELETE FROM ai_chat_slots WHERE ticket_id = $1 RETURNING 1
     )
     UPDATE ai_chat_gate
        SET in_flight = GREATEST(0, in_flight - 1)
      WHERE id = 1 AND EXISTS (SELECT 1 FROM removed)`,
    [ticketId]
  ).catch((e) => console.error('[ai_chat_gate] failed to release a slot:', e.message));
}

async function queuePosition(ticketId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS ahead FROM ai_chat_queue WHERE id < $1`,
    [ticketId]
  );
  return (rows[0]?.ahead || 0) + 1; // 1-based: "you're #1" means you're next
}

/**
 * Wait for a turn to call the model. Resolves once a slot is granted, or once
 * MAX_WAIT_MS elapses — the caller must check `granted` and fall back to a
 * non-model answer (the existing RAG fallback) when it is false, and must
 * call `release()` exactly once after the model call finishes, success or
 * failure, or the slot leaks until the staleness reaper frees it.
 *
 * @param {(info: {position:number, etaSeconds:number}) => void} [onQueued]
 *   Called on every poll tick while waiting, so a streaming caller can push a
 *   live "you're #2, ~10s" update over the SSE connection it already has open.
 */
export async function waitForTurn(onQueued) {
  const { rows } = await query(`INSERT INTO ai_chat_queue DEFAULT VALUES RETURNING id`);
  const ticketId = rows[0].id;
  const startedAt = Date.now();

  try {
    while (true) {
      if (await tryClaim(ticketId, MAX_CONCURRENT)) {
        return { granted: true, release: () => releaseSlot(ticketId) };
      }

      await reapStaleSlots();

      if (Date.now() - startedAt >= MAX_WAIT_MS) {
        return { granted: false, release: () => {} };
      }

      if (onQueued) {
        const position = await queuePosition(ticketId);
        // A slot opens roughly every (avg turn time / MAX_CONCURRENT); a
        // round, honest-feeling estimate beats false precision here.
        const etaSeconds = Math.max(2, Math.round((position - 1) * 6));
        onQueued({ position, etaSeconds });
      }

      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  } finally {
    // The ticket's only job was ordering the wait; once granted (or given up
    // on) it no longer occupies a place in line.
    await query(`DELETE FROM ai_chat_queue WHERE id = $1`, [ticketId]).catch(() => {});
  }
}

export default { waitForTurn };
