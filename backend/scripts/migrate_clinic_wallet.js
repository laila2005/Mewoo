/**
 * PetPulse — Clinic Wallet (Phase 1): pet-owner prepaid credit tied to one
 * vet/clinic, spendable on future appointments at that same clinic.
 *   • clinic_wallets              — one balance per (owner, vet) pair.
 *   • clinic_wallet_transactions  — append-only ledger: deposit/payment/refund.
 *   • appointments.paid_via_wallet, appointments.wallet_amount — records that
 *     a specific appointment was settled from the wallet, and for how much,
 *     without having to join the ledger just to render a receipt.
 * Usage: node backend/scripts/migrate_clinic_wallet.js
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) { console.error('❌ Missing DATABASE_URL'); process.exit(1); }
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const pool = new pg.Pool({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS clinic_wallets (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vet_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        balance     numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
        created_at  timestamptz NOT NULL DEFAULT now(),
        UNIQUE (owner_id, vet_id)
      );
    `);
    console.log('✅ clinic_wallets table ready.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS clinic_wallet_transactions (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id      uuid NOT NULL REFERENCES clinic_wallets(id) ON DELETE CASCADE,
        type           varchar(20) NOT NULL CHECK (type IN ('deposit', 'payment', 'refund')),
        amount         numeric NOT NULL CHECK (amount > 0),
        appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
        created_at     timestamptz NOT NULL DEFAULT now()
      );
    `);
    console.log('✅ clinic_wallet_transactions table ready.');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wallet_txns_wallet ON clinic_wallet_transactions (wallet_id, created_at DESC);`);

    await client.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS paid_via_wallet BOOLEAN NOT NULL DEFAULT false;`);
    await client.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS wallet_amount numeric;`);
    console.log('✅ appointments.paid_via_wallet / wallet_amount added.');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();
