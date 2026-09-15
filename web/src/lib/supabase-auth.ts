import { createClient, type SupportedStorage } from "@supabase/supabase-js";

export const GOOGLE_AUTH_STORAGE_KEY = "cd_google_auth";

/**
 * Supabase client for Auth operations (uses anon key, not service role).
 * Service role key bypasses RLS but can't be used for auth flows.
 */
export function getSupabaseAuth(storage?: SupportedStorage) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: !!storage,
      ...(storage ? { flowType: "pkce", storageKey: GOOGLE_AUTH_STORAGE_KEY, storage } : {}),
    },
  });
}
