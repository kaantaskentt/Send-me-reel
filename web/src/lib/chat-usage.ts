import type { SupabaseClient } from "@supabase/supabase-js";

// Free users get a small daily taste of chat so they form a relationship with
// the assistant before being asked to upgrade. Premium bypasses this at the
// application layer but still has the columns populated so the gate logic
// stays uniform.
export const FREE_DAILY_CHAT_LIMIT = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ChatUsage {
  /** Hard daily limit for the user's tier — null for premium (unlimited). */
  limit: number | null;
  /** Messages still available in the current window. null for premium. */
  remaining: number | null;
  /** ISO timestamp when the window rolls over. null when no window is active. */
  resetAt: string | null;
  /** True when a free user has hit zero remaining. */
  locked: boolean;
}

interface UsageRow {
  daily_chat_count: number | null;
  daily_chat_reset_at: string | null;
}

function buildUsage(row: UsageRow | null, premium: boolean): ChatUsage {
  if (premium) {
    return { limit: null, remaining: null, resetAt: null, locked: false };
  }

  const now = Date.now();
  const resetAtMs = row?.daily_chat_reset_at ? Date.parse(row.daily_chat_reset_at) : 0;
  const windowActive = resetAtMs > now;
  const used = windowActive ? row?.daily_chat_count ?? 0 : 0;
  const remaining = Math.max(0, FREE_DAILY_CHAT_LIMIT - used);

  return {
    limit: FREE_DAILY_CHAT_LIMIT,
    remaining,
    resetAt: windowActive ? new Date(resetAtMs).toISOString() : null,
    locked: remaining <= 0,
  };
}

export async function getChatUsage(
  db: SupabaseClient,
  userId: string,
  premium: boolean,
): Promise<ChatUsage> {
  if (premium) return buildUsage(null, true);
  const { data } = await db
    .from("users")
    .select("daily_chat_count, daily_chat_reset_at")
    .eq("id", userId)
    .single<UsageRow>();
  return buildUsage(data ?? null, false);
}

/**
 * Increment the free-tier daily counter. Premium users are a no-op.
 *
 * Returns the post-increment usage. If the user was already locked, returns
 * the lock state without touching the row so the caller can 429 cleanly.
 */
export async function consumeChatMessage(
  db: SupabaseClient,
  userId: string,
  premium: boolean,
): Promise<ChatUsage> {
  if (premium) return buildUsage(null, true);

  const { data: row } = await db
    .from("users")
    .select("daily_chat_count, daily_chat_reset_at")
    .eq("id", userId)
    .single<UsageRow>();

  const now = Date.now();
  const existingResetMs = row?.daily_chat_reset_at ? Date.parse(row.daily_chat_reset_at) : 0;
  const windowActive = existingResetMs > now;
  const currentCount = windowActive ? row?.daily_chat_count ?? 0 : 0;

  if (currentCount >= FREE_DAILY_CHAT_LIMIT) {
    return buildUsage(row ?? null, false);
  }

  const newCount = currentCount + 1;
  const newResetIso = windowActive
    ? new Date(existingResetMs).toISOString()
    : new Date(now + WINDOW_MS).toISOString();

  await db
    .from("users")
    .update({ daily_chat_count: newCount, daily_chat_reset_at: newResetIso })
    .eq("id", userId);

  return buildUsage(
    { daily_chat_count: newCount, daily_chat_reset_at: newResetIso },
    false,
  );
}
