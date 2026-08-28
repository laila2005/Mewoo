/**
 * PetPluse — Migration: beta partner invite links.
 *
 * Marketing hands an invited clinic a link carrying an invite code. When that
 * clinic signs up with the code, its professional profile is created already
 * approved instead of waiting in the manual verification queue.
 *
 *   • partner_invites             — the codes themselves (role-scoped, capped, expiring)
 *   • partner_invite_redemptions  — one row per account that used a code
 *
 * A launch code (BETA-CLINIC-2026) is seeded so marketing has a working link
 * the moment this runs. Idempotent — safe to run repeatedly.
 *
 * Usage: node backend/scripts/migrate_partner_invites.js
 */
import { query } from '../src/config/db.js';

const migrate = async () => {
    try {
        console.log('🚀 Starting partner_invites migration...');

        // NOTE: users.id is UUID in this schema (see docs/diagrams/schema.sql),
        // so every FK to it must be UUID — not INTEGER.
        await query(`
            CREATE TABLE IF NOT EXISTS partner_invites (
                code         VARCHAR(64) PRIMARY KEY,
                label        VARCHAR(160) NOT NULL,
                role         VARCHAR(20)  NOT NULL,
                auto_approve BOOLEAN      NOT NULL DEFAULT TRUE,
                max_uses     INTEGER      NOT NULL DEFAULT 1,
                used_count   INTEGER      NOT NULL DEFAULT 0,
                expires_at   TIMESTAMPTZ,
                revoked_at   TIMESTAMPTZ,
                created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            );
        `);
        console.log('✅ partner_invites table ready.');

        await query(`
            CREATE TABLE IF NOT EXISTS partner_invite_redemptions (
                id          SERIAL PRIMARY KEY,
                code        VARCHAR(64) NOT NULL REFERENCES partner_invites(code) ON DELETE CASCADE,
                user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (code, user_id)
            );
        `);
        console.log('✅ partner_invite_redemptions table ready.');

        await query(`
            CREATE INDEX IF NOT EXISTS idx_partner_invite_redemptions_code
                ON partner_invite_redemptions(code);
        `);
        console.log('✅ index idx_partner_invite_redemptions_code ready.');

        // Seed the launch campaign code only if it isn't already there, so
        // re-running never resets its usage counter or extends its expiry.
        await query(`
            INSERT INTO partner_invites (code, label, role, auto_approve, max_uses, expires_at)
            VALUES ('BETA-CLINIC-2026', 'Beta clinic partners — launch campaign', 'vet', TRUE, 200, NOW() + INTERVAL '90 days')
            ON CONFLICT (code) DO NOTHING;
        `);
        console.log('✅ Launch invite BETA-CLINIC-2026 seeded (200 uses, 90 days).');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
