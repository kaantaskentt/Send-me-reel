import { supabase } from "../db/client.js";
import { executePipeline } from "./orchestrator.js";
import { detectPlatform } from "./urlRouter.js";

const POLL_INTERVAL_MS = 5_000;
const MAX_ATTEMPTS = 3;
const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes in non-terminal status = stuck

/**
 * On startup, reset any rows left in a non-terminal status from a previous crash.
 * Without this, a process kill mid-analysis would leave rows stuck forever.
 */
async function recoverStuckRows(): Promise<void> {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();
  const nonTerminal = ["pending", "scraping", "transcribing", "analyzing", "generating"];

  const { data, error } = await supabase
    .from("analyses")
    .update({ status: "pending" })
    .in("status", nonTerminal)
    .eq("source", "web")
    .lt("updated_at", cutoff)
    .lt("attempt_count", MAX_ATTEMPTS)
    .select("id");

  if (error) {
    console.error("[queue] Recovery sweep error:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log(`[queue] Recovered ${data.length} stuck row(s) to 'pending' for retry`);
  }

  // Any row past max attempts that's still non-terminal → mark permanently failed
  const { data: failed, error: failError } = await supabase
    .from("analyses")
    .update({ status: "failed", error_message: "Exceeded max retry attempts (process restart)" })
    .in("status", nonTerminal)
    .eq("source", "web")
    .gte("attempt_count", MAX_ATTEMPTS)
    .select("id");

  if (failError) {
    console.error("[queue] Recovery failure-mark error:", failError);
    return;
  }
  if (failed && failed.length > 0) {
    console.log(`[queue] Marked ${failed.length} row(s) as permanently failed (exceeded ${MAX_ATTEMPTS} attempts)`);
  }
}

/**
 * Polls Supabase for web-sourced pending analyses and processes them.
 * Runs alongside the Telegram bot in the same process.
 */
export function startQueueWorker(): void {
  console.log("[queue] Web analysis queue worker started");

  // Kick off a one-time recovery sweep — catches rows stuck from a prior crash
  recoverStuckRows().catch((err) => console.error("[queue] Recovery sweep threw:", err));

  async function poll() {
    try {
      // Atomically claim the oldest pending web analysis under max attempts
      const { data: row, error } = await supabase
        .from("analyses")
        .select("id, user_id, source_url, platform, attempt_count")
        .eq("status", "pending")
        .eq("source", "web")
        .lt("attempt_count", MAX_ATTEMPTS)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (error || !row) return; // Nothing to process

      const nextAttempt = (row.attempt_count || 0) + 1;

      // Claim by bumping status + attempt_count. If another worker grabbed it, this is a no-op.
      const { data: claimed } = await supabase
        .from("analyses")
        .update({ status: "scraping", attempt_count: nextAttempt })
        .eq("id", row.id)
        .eq("status", "pending")
        .select("id")
        .single();

      if (!claimed) return; // Another worker got it

      console.log(`[queue] Processing web analysis ${row.id} (attempt ${nextAttempt}/${MAX_ATTEMPTS}) for ${row.source_url}`);

      try {
        const platform = row.platform || detectPlatform(row.source_url);
        await executePipeline(row.user_id, row.id, row.source_url, platform);
        console.log(`[queue] Completed web analysis ${row.id}`);
      } catch (pipelineErr) {
        const errMsg = pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr);
        console.error(`[queue] Pipeline failed for ${row.id} (attempt ${nextAttempt}/${MAX_ATTEMPTS}):`, errMsg);

        if (nextAttempt >= MAX_ATTEMPTS) {
          // Max retries hit — mark permanently failed (executePipeline already refunded credits)
          await supabase
            .from("analyses")
            .update({ status: "failed", error_message: `Failed after ${MAX_ATTEMPTS} attempts: ${errMsg.slice(0, 200)}` })
            .eq("id", row.id);
          console.log(`[queue] Marked ${row.id} as permanently failed`);
        } else {
          // Reset to pending so next poll retries
          await supabase
            .from("analyses")
            .update({ status: "pending", error_message: `Attempt ${nextAttempt} failed: ${errMsg.slice(0, 200)}` })
            .eq("id", row.id);
          console.log(`[queue] Reset ${row.id} to 'pending' for retry`);
        }
      }
    } catch (err) {
      // Queue-level poll error (not pipeline error)
      console.error("[queue] Poll error:", err);
    }
  }

  setInterval(poll, POLL_INTERVAL_MS);
  // Run immediately on start too
  poll();
}
