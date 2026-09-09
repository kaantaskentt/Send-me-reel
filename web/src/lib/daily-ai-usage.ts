import type { SupabaseClient } from "@supabase/supabase-js";

export const DAILY_AI_REQUEST_LIMIT = 20;
export interface DailyAiReservation { allowed: boolean; remaining: number; resetAt: string }

/** Existing columns, atomic compare-and-set, fail closed. Every writer must use this helper. */
export async function reserveDailyAiRequest(db: SupabaseClient, userId: string): Promise<DailyAiReservation> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: row, error } = await db.from("users").select("daily_chat_count, daily_chat_reset_at").eq("id", userId).single();
    if (error || !row) throw new Error("Usage allowance could not be checked");
    const now = Date.now();
    const reset = typeof row.daily_chat_reset_at === "string" ? Date.parse(row.daily_chat_reset_at) : 0;
    const active = Number.isFinite(reset) && reset > now;
    const count = active ? Number(row.daily_chat_count ?? 0) : 0;
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid usage allowance");
    const resetAt = active ? new Date(reset).toISOString() : new Date(now + 86_400_000).toISOString();
    if (count >= DAILY_AI_REQUEST_LIMIT) return { allowed: false, remaining: 0, resetAt };
    let query = db.from("users").update({ daily_chat_count: count + 1, daily_chat_reset_at: resetAt }).eq("id", userId);
    query = row.daily_chat_count === null ? query.is("daily_chat_count", null) : query.eq("daily_chat_count", row.daily_chat_count);
    query = row.daily_chat_reset_at === null ? query.is("daily_chat_reset_at", null) : query.eq("daily_chat_reset_at", row.daily_chat_reset_at);
    const { data: updated, error: updateError } = await query.select("id").maybeSingle();
    if (updateError) throw new Error("Usage allowance could not be reserved");
    if (updated) return { allowed: true, remaining: DAILY_AI_REQUEST_LIMIT - count - 1, resetAt };
  }
  throw new Error("Usage allowance is busy; retry shortly");
}
