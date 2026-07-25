import { query } from '../src/config/db.js';

/**
 * Creates ai_feedback — a lightweight quality signal for VetAI replies
 * (thumbs up/down from users). Idempotent.
 */
const migrate = async () => {
  try {
    console.log('🚀 Starting ai_feedback migration...');
    await query(`
      CREATE TABLE IF NOT EXISTS ai_feedback (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID,
        session_id UUID,
        rating SMALLINT NOT NULL,          -- 1 = up, -1 = down
        message_excerpt TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_feedback_created ON ai_feedback (created_at DESC);`);
    console.log('✅ ai_feedback table ready.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
