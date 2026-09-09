import { supabase } from "../db/client.js";
import * as analyses from "../db/analyses.js";
import * as credits from "../db/credits.js";
import { executePipeline } from "./orchestrator.js";
import { detectPlatform } from "./urlRouter.js";
import { ServiceError } from "./types.js";

const POLL_INTERVAL_MS = 5_000;
export const MAX_ATTEMPTS = 3;
const STUCK_THRESHOLD_MS = 10 * 60 * 1000;
let workerStarted = false;

export function shouldRetryPipeline(error: unknown, attempt: number): boolean {
  return attempt < MAX_ATTEMPTS && (!(error instanceof ServiceError) || error.retryable);
}

/** Intermediate failures do not refund the original charge. */
export async function settleQueueFailure(
  error: unknown,
  attempt: number,
  effects: {
    retry: (message: string) => Promise<void>;
    fail: (message: string) => Promise<void>;
    refund: () => Promise<void>;
  },
): Promise<"retry" | "failed"> {
  const message = error instanceof Error ? error.message : String(error);
  if (shouldRetryPipeline(error, attempt)) {
    await effects.retry(`Attempt ${attempt} failed: ${message.slice(0, 200)}`);
    return "retry";
  }
  // Persist the terminal state before refunding so a later poll cannot process it again.
  await effects.fail(`Failed after ${attempt} attempt${attempt === 1 ? "" : "s"}: ${message.slice(0, 200)}`);
  await effects.refund();
  return "failed";
}

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
  if (error) throw new Error(`Queue recovery failed: ${error.message}`);
  if (data?.length) console.log(`[queue] Recovered ${data.length} stuck row(s)`);

  const { data: failed, error: failError } = await supabase
    .from("analyses")
    .update({ status: "failed", error_message: "Exceeded max retry attempts (process restart)" })
    .in("status", nonTerminal)
    .eq("source", "web")
    .lt("updated_at", cutoff)
    .gte("attempt_count", MAX_ATTEMPTS)
    .select("id");
  if (failError) throw new Error(`Queue recovery failure marking failed: ${failError.message}`);
  if (failed?.length) console.log(`[queue] Marked ${failed.length} expired row(s) permanently failed`);
}

/** Repair a crash between terminal-state persistence and the idempotent refund RPC. */
async function reconcileRefunds(): Promise<void> {
  const { data, error } = await supabase.from("analyses")
    .select("id").eq("status", "failed")
    .not("credits_reserved_at", "is", null).is("credits_refunded_at", null)
    .order("created_at", { ascending: true }).limit(25);
  if (error) throw new Error(`Refund recovery requires migration 022: ${error.message}`);
  for (const row of data ?? []) {
    try { await credits.refundAnalysis(row.id); }
    catch (error) { console.error(`[queue] Refund still pending for ${row.id}:`, error); }
  }
}

/** One in-flight web analysis per process. Claim remains conditional across processes. */
export function startQueueWorker(): void {
  if (workerStarted) return;
  workerStarted = true;
  console.log("[queue] Web analysis queue worker started (concurrency: 1)");
  let lastRefundSweep = 0;

  async function poll(): Promise<void> {
    const { data: row, error } = await supabase
      .from("analyses")
      .select("id, user_id, source_url, platform, attempt_count, metadata")
      .eq("status", "pending")
      .eq("source", "web")
      .lt("attempt_count", MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Queue read failed: ${error.message}`);
    if (!row) return;
    const nextAttempt = (row.attempt_count || 0) + 1;
    const { data: claimed, error: claimError } = await supabase
      .from("analyses")
      .update({ status: "scraping", attempt_count: nextAttempt })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (claimError) throw new Error(`Queue claim failed: ${claimError.message}`);
    if (!claimed) return;

    console.log(`[queue] Processing analysis ${row.id} (attempt ${nextAttempt}/${MAX_ATTEMPTS})`);
    try {
      const platform = row.platform || detectPlatform(row.source_url);
      const userNote = (row.metadata as { userNote?: string } | null)?.userNote || undefined;
      await executePipeline(row.user_id, row.id, row.source_url, platform, userNote, { deferFailureHandling: true });
      console.log(`[queue] Completed analysis ${row.id}`);
    } catch (error) {
      console.error(`[queue] Attempt ${nextAttempt} failed for ${row.id}:`, error instanceof Error ? error.message : String(error));
      const disposition = await settleQueueFailure(error, nextAttempt, {
        retry: (errorMessage) => analyses.updateResult(row.id, { status: "pending", errorMessage }),
        fail: (errorMessage) => analyses.updateResult(row.id, { status: "failed", errorMessage }),
        refund: async () => { await credits.refundAnalysis(row.id); },
      });
      console.log(`[queue] Analysis ${row.id}: ${disposition}`);
    }
  }

  async function tick(): Promise<void> {
    try {
      if (Date.now() - lastRefundSweep >= 60_000) {
        lastRefundSweep = Date.now();
        await reconcileRefunds().catch((error) => console.error("[queue] Refund sweep error:", error));
      }
      await poll();
    }
    catch (error) { console.error("[queue] Poll error:", error); }
    finally { setTimeout(() => { void tick(); }, POLL_INTERVAL_MS); }
  }

  // Finish recovery before claiming work. Scheduling the next tick only after completion
  // prevents setInterval from creating an unbounded number of concurrent pipelines.
  void recoverStuckRows()
    .catch((error) => console.error("[queue] Recovery sweep error:", error))
    .then(tick);
}
