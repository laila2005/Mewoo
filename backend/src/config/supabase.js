/**
 * PetPulse — Supabase Client Configuration
 * 
 * Initializes and exports the Supabase client using @supabase/supabase-js.
 * Uses the service_role key for server-side operations (bypasses RLS).
 * 
 * Required environment variables:
 *   SUPABASE_URL       — Your Supabase project URL (e.g. https://sffdyrgnqruvjmecvveu.supabase.co)
 *   SUPABASE_ANON_KEY  — Your Supabase anon/public key (for client-side / RLS-respecting ops)
 *   SUPABASE_SERVICE_KEY — Your Supabase service_role key (for server-side / admin ops)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing SUPABASE_URL in environment variables.');
}

/**
 * Admin client — uses the service_role key to bypass Row Level Security.
 * Use this for trusted server-side operations (user creation, seeding, admin tasks).
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Public client — uses the anon key, respects Row Level Security.
 * Use this for operations that should respect RLS policies.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabase;
