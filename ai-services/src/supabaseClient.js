/**
 * PetPulse — Supabase Client for AI Services
 * 
 * Shared Supabase admin client used by the agentic tool-calling system.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env from backend/ directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('❌ Missing SUPABASE_URL in environment variables.');
}

/**
 * Admin client — uses service_role key to bypass RLS.
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export default supabaseAdmin;
