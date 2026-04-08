import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for Auth operations (uses anon key, not service role).
 * Service role key bypasses RLS but can't be used for auth flows.
 */
export function getSupabaseAuth() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  return createClient(url, anonKey);
}
