// ─────────────────────────────────────────────────────────────
// Beta partner invites — redemption logic.
//
// Marketing invites a clinic, the clinic signs up with the code, and its
// professional profile is created already approved instead of queueing for a
// manual license review. The invite ONLY ever influences a profile's
// verification status — it never touches users.role and never grants admin.
// ─────────────────────────────────────────────────────────────
import { getClient } from '../config/db.js';

const ALLOWED_ROLES = ['vet', 'trainer', 'vendor'];

/**
 * Normalise a raw code from a URL/form into its canonical stored form:
 * uppercase, trimmed, anything outside [A-Z0-9-] stripped, capped at 64 chars
 * (the column width). Returns '' for anything unusable.
 */
export function normaliseCode(raw) {
    if (typeof raw !== 'string') return '';
    return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 64);
}

/**
 * Redeem an invite code for a freshly created user.
 *
 * `db` may be either a pg client already inside a caller-owned transaction, or
 * the pool/query helper. The register controller does NOT use an explicit
 * transaction, so in that case we take a dedicated client and wrap the
 * read-modify-write in one — otherwise the SELECT ... FOR UPDATE would release
 * its lock immediately and concurrent signups could push used_count past
 * max_uses.
 *
 * Never throws for a bad code — returns { ok: false, reason } instead, so a
 * caller can fail closed without ever blocking a signup.
 *
 * @returns {Promise<{ok: false, reason: string} | {ok: true, autoApprove: boolean, label: string}>}
 */
export async function redeemInvite(db, rawCode, userId, role) {
    const code = normaliseCode(rawCode);
    if (!code) return { ok: false, reason: 'invalid_code' };
    if (!userId) return { ok: false, reason: 'missing_user' };
    if (!ALLOWED_ROLES.includes(role)) return { ok: false, reason: 'role_mismatch' };

    // A pg client hands back a release() — that means the caller owns the
    // transaction and we must not open our own.
    const callerOwnsTx = !!(db && typeof db.query === 'function' && typeof db.release === 'function');
    const client = callerOwnsTx ? db : await getClient();
    const run = callerOwnsTx
        ? (text, params) => db.query(text, params)
        : (text, params) => client.query(text, params);

    try {
        if (!callerOwnsTx) await run('BEGIN');

        const inviteRes = await run(
            `SELECT code, label, role, auto_approve, max_uses, used_count, expires_at, revoked_at
             FROM partner_invites
             WHERE code = $1
             FOR UPDATE`,
            [code]
        );

        if (inviteRes.rows.length === 0) {
            if (!callerOwnsTx) await run('ROLLBACK');
            return { ok: false, reason: 'not_found' };
        }

        const invite = inviteRes.rows[0];

        let reason = null;
        if (invite.revoked_at) reason = 'revoked';
        else if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) reason = 'expired';
        else if (invite.used_count >= invite.max_uses) reason = 'exhausted';
        else if (invite.role !== role) reason = 'role_mismatch';

        if (reason) {
            if (!callerOwnsTx) await run('ROLLBACK');
            return { ok: false, reason };
        }

        // Claim the redemption row first: if this user already redeemed this
        // code, nothing is inserted and we stop — otherwise a retry would burn
        // a second use out of max_uses without recording anything.
        const claim = await run(
            `INSERT INTO partner_invite_redemptions (code, user_id)
             VALUES ($1, $2)
             ON CONFLICT (code, user_id) DO NOTHING
             RETURNING id`,
            [code, userId]
        );
        if (claim.rowCount === 0) {
            if (!callerOwnsTx) await run('ROLLBACK');
            return { ok: false, reason: 'already_redeemed' };
        }

        await run('UPDATE partner_invites SET used_count = used_count + 1 WHERE code = $1', [code]);

        if (!callerOwnsTx) await run('COMMIT');

        return { ok: true, autoApprove: !!invite.auto_approve, label: invite.label };
    } catch (error) {
        if (!callerOwnsTx) {
            try { await run('ROLLBACK'); } catch { /* connection already gone */ }
        }
        throw error;
    } finally {
        if (!callerOwnsTx) client.release();
    }
}

export default { normaliseCode, redeemInvite };
