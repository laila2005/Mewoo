/**
 * PetPluse — shop storefronts.
 *
 * Shops had no public page. Every "shop" link pointed at
 * /marketplace?shop=<name>, which matched on the name itself: two shops with
 * the same name merged into one catalogue, and renaming a shop broke every link
 * that had ever been shared. There was also nowhere to put a bio, opening
 * hours, delivery terms or a logo, so even a page would have had nothing to
 * show.
 *
 * This adds:
 *   - slug        a stable public address, generated once and never regenerated
 *   - the fields an owner needs to make the page theirs (all optional)
 *   - follows     so a customer can be told when a shop lists something new
 *   - a view counter, so customisation has feedback
 *
 * Idempotent: safe to run repeatedly. Existing rows are backfilled, and the
 * four live shops sharing the name "E2E Test Shop" each get their own address.
 *
 * Usage:  node scripts/migrate_shop_storefront.js
 */
import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import { slugFromShop, uniqueSlug } from '../src/services/shopSlug.js';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Nullable, every one of them: a shop that fills in nothing must still work.
const COLUMNS = [
  ['slug',          'VARCHAR(60)'],
  ['bio',           'TEXT'],
  ['logo_url',      'TEXT'],
  ['banner_url',    'TEXT'],
  ['phone',         'VARCHAR(32)'],
  ['whatsapp',      'VARCHAR(32)'],
  ['hours',         'JSONB'],
  ['delivery_note', 'TEXT'],
  ['return_policy', 'TEXT'],
  ['socials',       'JSONB'],
  ['founded_year',  'INTEGER'],
  ['view_count',    'INTEGER DEFAULT 0'],
];

const run = async () => {
  await client.connect();
  try {
    await client.query('BEGIN');

    for (const [name, type] of COLUMNS) {
      await client.query(`ALTER TABLE pet_shops ADD COLUMN IF NOT EXISTS ${name} ${type}`);
    }
    console.log(`✅ pet_shops: ${COLUMNS.length} storefront columns present`);

    // ── Backfill slugs ──────────────────────────────────────────────
    // Ordered by created_at so the assignment is deterministic and the oldest
    // shop keeps the bare slug. Re-running must never reshuffle addresses.
    const existing = await client.query(
      `SELECT slug FROM pet_shops WHERE slug IS NOT NULL AND slug <> ''`
    );
    const taken = new Set(existing.rows.map((r) => String(r.slug).toLowerCase()));

    const needing = await client.query(
      `SELECT id, name FROM pet_shops
        WHERE slug IS NULL OR slug = ''
        ORDER BY created_at NULLS LAST, id`
    );

    for (const shop of needing.rows) {
      const slug = uniqueSlug(slugFromShop(shop), taken);
      taken.add(slug);
      await client.query('UPDATE pet_shops SET slug = $1 WHERE id = $2', [slug, shop.id]);
      console.log(`   ${JSON.stringify(shop.name)} → /shop/${slug}`);
    }
    console.log(`✅ backfilled ${needing.rowCount} slug(s)`);

    // Unique only after backfill, or the constraint would reject the NULLs it
    // is being created to prevent.
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS pet_shops_slug_key ON pet_shops (LOWER(slug))`
    );
    console.log('✅ unique index on LOWER(slug)');

    // ── Follows ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS shop_follows (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id    UUID NOT NULL REFERENCES pet_shops(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (shop_id, user_id)
      )`);
    await client.query('CREATE INDEX IF NOT EXISTS shop_follows_user_idx ON shop_follows (user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS shop_follows_shop_idx ON shop_follows (shop_id)');
    console.log('✅ shop_follows');

    await client.query('COMMIT');
    console.log('\n🎉 storefront migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ migration rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

run();
