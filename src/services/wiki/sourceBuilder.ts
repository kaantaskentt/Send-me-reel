import { createHash } from "crypto";
import { supabase } from "../../db/client.js";
import { config } from "../../config.js";
import type { WikiSourceKind } from "../../db/wiki.js";

// ---------------------------------------------------------------------------
// Source builder — bot-side enqueue helpers for the per-user LLM Wiki.
//
// Writes immutable snapshots into user_wiki_sources and a matching pending row
// into user_wiki_jobs. The compiler worker (PR3+) is the only consumer.
//
// Every helper is BEST EFFORT. Caller must not await as a critical path. If
// the compiler is disabled or any DB write fails, we log and return — never
// rethrow into the analysis pipeline. The verdict has already shipped to the
// user; wiki ingestion is a side-channel.
// ---------------------------------------------------------------------------

interface AnalysisRow {
  id: string;
  user_id: string;
  source_url: string;
  platform: string;
  status: string;
  transcript: string | null;
  visual_summary: string | null;
  caption: string | null;
  metadata: Record<string, unknown> | null;
  verdict: string | null;
  verdict_intent: string | null;
  subject_research: Record<string, unknown> | null;
  tried_at: string | null;
  set_aside_at: string | null;
  starred_at: string | null;
  completed_at: string | null;
  created_at: string;
}

function hashPayload(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

// "Just a watch" detection. The verdict prompt prepends 🍵 for items that
// shouldn't drive action right now; verdict_intent='ignore' is the same
// signal in structured form. Either is enough.
function detectJustWatch(verdict: string | null, intent: string | null): boolean {
  if (intent === "ignore") return true;
  if (!verdict) return false;
  return verdict.includes("🍵");
}

function shorten(text: string | null, max: number): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1) + "…";
}

async function insertSourceAndJob(row: {
  userId: string;
  sourceKind: WikiSourceKind;
  analysisId?: string | null;
  chatThreadId?: string | null;
  chatMessageId?: string | null;
  eventTable?: string | null;
  eventId?: string | null;
  sourceUrl?: string | null;
  title?: string | null;
  contentHash: string;
  sourceSummary?: string | null;
  verdictSummary?: string | null;
  isJustWatch?: boolean;
  analysisState?: string | null;
  payload: Record<string, unknown>;
  jobType?: "compile_source" | "compile_chat_turn";
}): Promise<void> {
  const { data: source, error: sourceErr } = await supabase
    .from("user_wiki_sources")
    .insert({
      user_id: row.userId,
      source_kind: row.sourceKind,
      analysis_id: row.analysisId ?? null,
      chat_thread_id: row.chatThreadId ?? null,
      chat_message_id: row.chatMessageId ?? null,
      event_table: row.eventTable ?? null,
      event_id: row.eventId ?? null,
      source_url: row.sourceUrl ?? null,
      title: row.title ?? null,
      content_hash: row.contentHash,
      source_summary: row.sourceSummary ?? null,
      verdict_summary: row.verdictSummary ?? null,
      is_just_watch: row.isJustWatch ?? false,
      analysis_state: row.analysisState ?? null,
      payload: row.payload,
    })
    .select("id")
    .single();

  if (sourceErr || !source) {
    // Unique constraints can fire on retry of the same analysis/chat message.
    // 23505 = duplicate; treat as already-enqueued and move on.
    const code = (sourceErr as { code?: string } | null)?.code;
    if (code === "23505") return;
    console.error("[wiki] insert source failed:", sourceErr);
    return;
  }

  const jobType = row.jobType ?? "compile_source";
  const { error: jobErr } = await supabase
    .from("user_wiki_jobs")
    .insert({
      user_id: row.userId,
      source_id: source.id,
      source_user_id: row.userId,
      job_type: jobType,
    });
  if (jobErr) {
    console.error("[wiki] insert job failed:", jobErr);
  }
}

// ---------------------------------------------------------------------------
// analysis_completed — fired after executeVideoPipeline / executeArticlePipeline
// writes status='done'. Reads the row back so the snapshot reflects what
// actually persisted, not whatever was in memory mid-pipeline.
// ---------------------------------------------------------------------------

export async function enqueueAnalysisCompleted(
  userId: string,
  analysisId: string,
): Promise<void> {
  if (!config.wikiCompilerEnabled) return;

  try {
    const { data, error } = await supabase
      .from("analyses")
      .select(
        "id, user_id, source_url, platform, status, transcript, visual_summary, caption, metadata, verdict, verdict_intent, subject_research, tried_at, set_aside_at, starred_at, completed_at, created_at",
      )
      .eq("id", analysisId)
      .eq("user_id", userId)
      .single<AnalysisRow>();

    if (error || !data) {
      console.error("[wiki] analysis fetch for source build failed:", error);
      return;
    }

    if (data.status !== "done") return;

    const isJustWatch = detectJustWatch(data.verdict, data.verdict_intent);

    // Compact path: don't bloat the wiki with low-value reels. Source still
    // gets persisted so the timeline/log knows the user processed it.
    const payload = isJustWatch
      ? {
          analysis_id: data.id,
          source_url: data.source_url,
          platform: data.platform,
          verdict_intent: data.verdict_intent,
          is_just_watch: true,
          source_summary: shorten(data.caption ?? data.visual_summary, 200),
          verdict_summary: shorten(data.verdict, 240),
          provenance: {
            analysis_id: data.id,
            verdict_excerpt: shorten(data.verdict, 400),
          },
          state: {
            tried_at: data.tried_at,
            set_aside_at: data.set_aside_at,
            starred_at: data.starred_at,
          },
        }
      : {
          analysis_id: data.id,
          source_url: data.source_url,
          platform: data.platform,
          verdict_intent: data.verdict_intent,
          verdict: data.verdict,
          caption: data.caption,
          transcript_excerpt: shorten(data.transcript, 4000),
          visual_summary: data.visual_summary,
          subject_research: data.subject_research,
          metadata: data.metadata,
          user_note: (data.metadata as Record<string, unknown> | null)?.userNote ?? null,
          state: {
            tried_at: data.tried_at,
            set_aside_at: data.set_aside_at,
            starred_at: data.starred_at,
          },
          completed_at: data.completed_at,
        };

    const contentHash = hashPayload({ ...payload, kind: "analysis_completed" });

    await insertSourceAndJob({
      userId,
      sourceKind: "analysis_completed",
      analysisId: data.id,
      sourceUrl: data.source_url,
      title: shorten(data.caption, 120),
      contentHash,
      sourceSummary: isJustWatch ? (payload as { source_summary?: string | null }).source_summary ?? null : shorten(data.caption ?? data.visual_summary, 240),
      verdictSummary: shorten(data.verdict, 240),
      isJustWatch,
      payload,
    });
  } catch (err) {
    console.error("[wiki] enqueueAnalysisCompleted failed:", err);
  }
}
