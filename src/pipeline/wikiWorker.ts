import { supabase } from "../db/client.js";
import { config } from "../config.js";
import type { DbUserWikiJob, DbUserWikiSource } from "../db/wiki.js";
import { compileWikiSource } from "../services/wiki/compiler.js";

const POLL_INTERVAL_MS = 5_000;
const MAX_ATTEMPTS = 3;
const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

interface WikiJobRow extends DbUserWikiJob {
  user_wiki_sources?: DbUserWikiSource | DbUserWikiSource[] | null;
}

type TerminalStatus = "done" | "ignored" | "failed";

function asSource(row: WikiJobRow): DbUserWikiSource | null {
  const raw = row.user_wiki_sources;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateCompileJob(row: WikiJobRow): DbUserWikiSource | null {
  const source = asSource(row);

  if (
    row.job_type === "refresh_index" ||
    row.job_type === "lint_user_wiki" ||
    row.job_type === "backfill_user"
  ) {
    return null;
  }

  if (!source) {
    throw new Error(`job ${row.id} has no source`);
  }
  if (source.user_id !== row.user_id) {
    throw new Error(`source ${source.id} belongs to ${source.user_id}, not ${row.user_id}`);
  }
  if (row.source_id && source.id !== row.source_id) {
    throw new Error(`joined source ${source.id} does not match job source ${row.source_id}`);
  }
  if (!isObject(source.payload)) {
    throw new Error(`source ${source.id} payload must be a JSON object`);
  }
  if (!source.content_hash || source.content_hash.length < 16) {
    throw new Error(`source ${source.id} content_hash is missing or malformed`);
  }

  return source;
}

async function recoverStuckJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

  const { data, error } = await supabase
    .from("user_wiki_jobs")
    .update({ status: "pending", locked_at: null })
    .eq("status", "running")
    .lt("locked_at", cutoff)
    .lt("attempt_count", MAX_ATTEMPTS)
    .select("id");

  if (error) {
    console.error("[wiki-worker] recovery sweep error:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log(`[wiki-worker] Recovered ${data.length} stuck job(s) to pending`);
  }

  const { data: failed, error: failError } = await supabase
    .from("user_wiki_jobs")
    .update({
      status: "failed",
      locked_at: null,
      error_message: "Exceeded max retry attempts (process restart)",
    })
    .eq("status", "running")
    .lt("locked_at", cutoff)
    .gte("attempt_count", MAX_ATTEMPTS)
    .select("id");

  if (failError) {
    console.error("[wiki-worker] recovery failure-mark error:", failError);
    return;
  }
  if (failed && failed.length > 0) {
    console.log(`[wiki-worker] Marked ${failed.length} stuck job(s) failed`);
  }
}

async function markSource(
  source: DbUserWikiSource | null,
  status: Exclude<TerminalStatus, "failed">,
  reason: string | null,
): Promise<void> {
  if (!source) return;
  const { error } = await supabase
    .from("user_wiki_sources")
    .update({
      status,
      ingested_at: new Date().toISOString(),
      error_message: reason,
    })
    .eq("id", source.id)
    .eq("user_id", source.user_id);
  if (error) {
    console.error("[wiki-worker] source mark failed:", error);
  }
}

async function markJob(
  row: WikiJobRow,
  status: TerminalStatus,
  message: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("user_wiki_jobs")
    .update({
      status,
      locked_at: null,
      error_message: message,
    })
    .eq("id", row.id)
    .eq("user_id", row.user_id);
  if (error) {
    console.error("[wiki-worker] job mark failed:", error);
  }
}

async function markFailure(row: WikiJobRow, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const terminal = row.attempt_count >= MAX_ATTEMPTS;
  const status = terminal ? "failed" : "pending";

  const { error } = await supabase
    .from("user_wiki_jobs")
    .update({
      status,
      locked_at: null,
      error_message: message.slice(0, 500),
    })
    .eq("id", row.id)
    .eq("user_id", row.user_id);
  if (error) {
    console.error("[wiki-worker] failure mark failed:", error);
  }

  const source = asSource(row);
  if (terminal && source) {
    const { error: sourceErr } = await supabase
      .from("user_wiki_sources")
      .update({
        status: "failed",
        error_message: message.slice(0, 500),
      })
      .eq("id", source.id)
      .eq("user_id", source.user_id);
    if (sourceErr) {
      console.error("[wiki-worker] source failure mark failed:", sourceErr);
    }
  }
}

async function processJob(row: WikiJobRow): Promise<void> {
  const source = validateCompileJob(row);

  if (!source) {
    const reason = `${row.job_type} is reserved for later wiki maintenance work`;
    await markJob(row, "ignored", reason);
    console.log(`[wiki-worker] Ignored job=${row.id} type=${row.job_type}: ${reason}`);
    return;
  }

  const result = await compileWikiSource(source);

  await markSource(source, result.status, result.reason);
  await markJob(row, result.status, result.reason);

  console.log(
    `[wiki-worker] ${result.status} job=${row.id} type=${row.job_type}` +
      ` source=${source.id} kind=${source.source_kind}` +
      (result.touchedPages.length > 0 ? ` pages=${result.touchedPages.join(",")}` : ""),
  );
}

async function poll(): Promise<void> {
  try {
    const { data: row, error } = await supabase
      .from("user_wiki_jobs")
      .select("*, user_wiki_sources(*)")
      .eq("status", "pending")
      .lt("attempt_count", MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<WikiJobRow>();

    if (error) {
      console.error("[wiki-worker] poll select error:", error);
      return;
    }
    if (!row) return;

    const nextAttempt = (row.attempt_count ?? 0) + 1;
    const lockedAt = new Date().toISOString();

    const { data: claimed, error: claimError } = await supabase
      .from("user_wiki_jobs")
      .update({
        status: "running",
        attempt_count: nextAttempt,
        locked_at: lockedAt,
        error_message: null,
      })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error("[wiki-worker] claim error:", claimError);
      return;
    }
    if (!claimed) return;

    const claimedRow: WikiJobRow = {
      ...row,
      status: "running",
      attempt_count: nextAttempt,
      locked_at: lockedAt,
      error_message: null,
    };

    try {
      await processJob(claimedRow);
    } catch (err) {
      console.error("[wiki-worker] job failed:", err);
      await markFailure(claimedRow, err);
    }
  } catch (err) {
    console.error("[wiki-worker] poll error:", err);
  }
}

export function startWikiWorker(): void {
  if (!config.wikiCompilerEnabled) {
    console.log("[wiki-worker] disabled (WIKI_COMPILER_ENABLED is not true)");
    return;
  }

  console.log("[wiki-worker] started in compiler MVP mode");
  recoverStuckJobs().catch((err) =>
    console.error("[wiki-worker] recovery sweep threw:", err),
  );
  setInterval(() => {
    poll().catch((err) => console.error("[wiki-worker] poll threw:", err));
  }, POLL_INTERVAL_MS);
  poll().catch((err) => console.error("[wiki-worker] initial poll threw:", err));
}
