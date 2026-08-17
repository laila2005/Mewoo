/**
 * marketplace_products.rating defaulted to 5.0, so every newly created product
 * displayed five gold stars beside "0 reviews" — a perfect score nobody gave.
 *
 * 0 means "not rated yet", which the storefront now renders as grey stars.
 * Products that genuinely have reviews are untouched.
 *
 * Usage:  node scripts/migrate_product_rating_default.js
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

    await client.query('ALTER TABLE marketplace_products ALTER COLUMN rating SET DEFAULT 0');
    console.log('✅ rating default is now 0');

    // Only rows claiming a score with nothing behind it. A product with real
    // reviews keeps its average.
    const reset = await client.query(
      `UPDATE marketplace_products
          SET rating = 0
        WHERE COALESCE(reviews, 0) = 0
          AND COALESCE(rating, 0) > 0`
    );
    console.log(`✅ reset ${reset.rowCount} unrated product(s) that claimed a score`);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ migration rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

run();
