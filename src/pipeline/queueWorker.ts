import { supabase } from "../db/client.js";
import { executePipeline } from "./orchestrator.js";
import { detectPlatform } from "./urlRouter.js";

const POLL_INTERVAL_MS = 5_000;

/**
 * Polls Supabase for web-sourced pending analyses and processes them.
 * Runs alongside the Telegram bot in the same process.
 */
export function startQueueWorker(): void {
  console.log("[queue] Web analysis queue worker started");

  async function poll() {
    try {
      // Atomically claim the oldest pending web analysis
      const { data: row, error } = await supabase
        .from("analyses")
        .select("id, user_id, source_url, platform")
        .eq("status", "pending")
        .eq("source", "web")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (error || !row) return; // Nothing to process

      // Claim it by updating status — if another worker grabbed it first, this is a no-op
      const { data: claimed } = await supabase
        .from("analyses")
        .update({ status: "scraping" })
        .eq("id", row.id)
        .eq("status", "pending")
        .select("id")
        .single();

      if (!claimed) return; // Another worker got it

      console.log(`[queue] Processing web analysis ${row.id} for ${row.source_url}`);

      const platform = row.platform || detectPlatform(row.source_url);
      await executePipeline(row.user_id, row.id, row.source_url, platform);

      console.log(`[queue] Completed web analysis ${row.id}`);
    } catch (err) {
      // executePipeline handles its own error recording + credit refund,
      // so this catch is just for unexpected queue-level errors
      console.error("[queue] Poll error:", err);
    }
  }

  setInterval(poll, POLL_INTERVAL_MS);
  // Run immediately on start too
  poll();
}
