import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Wiki source builder — web-side. Web routes call these after a durable
// write (chat msg, state change, star toggle, todo creation, profile edit)
// to enqueue a snapshot into user_wiki_sources + user_wiki_jobs.
//
// Every helper is BEST EFFORT. Callers must not await as a critical path —
// always wrap in `.catch()` so a wiki failure never breaks the user-facing
// response. Compiler is gated by WIKI_COMPILER_ENABLED; helpers no-op when
// disabled.
// ---------------------------------------------------------------------------

type WikiSourceKind =
  | "analysis_completed"
  | "chat_user_message"
  | "chat_assistant_answer"
  | "analysis_state_changed"
  | "analysis_starred"
  | "todo_created"
  | "profile_updated"
  | "manual_correction";

type JobType =
  | "compile_source"
  | "compile_chat_turn"
  | "refresh_index"
  | "lint_user_wiki"
  | "backfill_user";

function isEnabled(): boolean {
  return process.env.WIKI_COMPILER_ENABLED === "true";
}

function hashPayload(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

function shorten(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1) + "…";
}

interface InsertArgs {
  db: SupabaseClient;
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
  jobType?: JobType;
}

async function insertSourceAndJob(args: InsertArgs): Promise<void> {
  const { db } = args;
  const { data: source, error: sourceErr } = await db
    .from("user_wiki_sources")
    .insert({
      user_id: args.userId,
      source_kind: args.sourceKind,
      analysis_id: args.analysisId ?? null,
      chat_thread_id: args.chatThreadId ?? null,
      chat_message_id: args.chatMessageId ?? null,
      event_table: args.eventTable ?? null,
      event_id: args.eventId ?? null,
      source_url: args.sourceUrl ?? null,
      title: args.title ?? null,
      content_hash: args.contentHash,
      source_summary: args.sourceSummary ?? null,
      verdict_summary: args.verdictSummary ?? null,
      is_just_watch: args.isJustWatch ?? false,
      analysis_state: args.analysisState ?? null,
      payload: args.payload,
    })
    .select("id")
    .single();

  if (sourceErr || !source) {
    const code = (sourceErr as { code?: string } | null)?.code;
    if (code === "23505") return; // dedupe — already enqueued
    console.error("[wiki] source insert failed:", sourceErr);
    return;
  }

  const { error: jobErr } = await db.from("user_wiki_jobs").insert({
    user_id: args.userId,
    source_id: source.id,
    source_user_id: args.userId,
    job_type: args.jobType ?? "compile_source",
  });
  if (jobErr) console.error("[wiki] job insert failed:", jobErr);
}

// ---------------------------------------------------------------------------
// chat_user_message — fired after a user message is persisted to chat_messages.
// Worker can decide durability later; we capture all turns so a useful
// retroactive recompile is possible.
// ---------------------------------------------------------------------------

export async function enqueueChatUserMessage(
  db: SupabaseClient,
  userId: string,
  threadId: string,
  messageId: string,
  analysisId: string | null,
  content: string,
): Promise<void> {
  if (!isEnabled()) return;
  try {
    const payload = {
      thread_id: threadId,
      message_id: messageId,
      analysis_id: analysisId,
      role: "user" as const,
      content,
    };
    await insertSourceAndJob({
      db,
      userId,
      sourceKind: "chat_user_message",
      chatThreadId: threadId,
      chatMessageId: messageId,
      analysisId,
      contentHash: hashPayload({ kind: "chat_user_message", ...payload }),
      sourceSummary: shorten(content, 240),
      payload,
      jobType: "compile_chat_turn",
    });
  } catch (err) {
    console.error("[wiki] enqueueChatUserMessage failed:", err);
  }
}

// ---------------------------------------------------------------------------
// chat_assistant_answer — assistant's full reply, after the stream completes.
// ---------------------------------------------------------------------------

export async function enqueueChatAssistantAnswer(
  db: SupabaseClient,
  userId: string,
  threadId: string,
  messageId: string,
  analysisId: string | null,
  content: string,
): Promise<void> {
  if (!isEnabled()) return;
  try {
    const payload = {
      thread_id: threadId,
      message_id: messageId,
      analysis_id: analysisId,
      role: "assistant" as const,
      content,
    };
    await insertSourceAndJob({
      db,
      userId,
      sourceKind: "chat_assistant_answer",
      chatThreadId: threadId,
      chatMessageId: messageId,
      analysisId,
      contentHash: hashPayload({ kind: "chat_assistant_answer", ...payload }),
      sourceSummary: shorten(content, 240),
      payload,
      jobType: "compile_chat_turn",
    });
  } catch (err) {
    console.error("[wiki] enqueueChatAssistantAnswer failed:", err);
  }
}

// ---------------------------------------------------------------------------
// analysis_state_changed — saved → tried | set_aside transitions. Strong
// preference signal: tried strengthens "things this user actually acts on".
// ---------------------------------------------------------------------------

export async function enqueueAnalysisStateChanged(
  db: SupabaseClient,
  userId: string,
  analysisId: string,
  newState: "saved" | "tried" | "set_aside",
): Promise<void> {
  if (!isEnabled()) return;
  try {
    const payload = { analysis_id: analysisId, state: newState };
    await insertSourceAndJob({
      db,
      userId,
      sourceKind: "analysis_state_changed",
      analysisId,
      analysisState: newState,
      contentHash: hashPayload({
        kind: "analysis_state_changed",
        ...payload,
        // Allow re-enqueue when state flips back and forth — bake timestamp
        // into the hash so we don't dedupe legitimate transitions.
        ts: Date.now(),
      }),
      sourceSummary: `state -> ${newState}`,
      payload,
    });
  } catch (err) {
    console.error("[wiki] enqueueAnalysisStateChanged failed:", err);
  }
}

// ---------------------------------------------------------------------------
// analysis_starred — durable interest signal (or unstar).
// ---------------------------------------------------------------------------

export async function enqueueAnalysisStarred(
  db: SupabaseClient,
  userId: string,
  analysisId: string,
  starred: boolean,
): Promise<void> {
  if (!isEnabled()) return;
  try {
    const payload = { analysis_id: analysisId, starred };
    await insertSourceAndJob({
      db,
      userId,
      sourceKind: "analysis_starred",
      analysisId,
      contentHash: hashPayload({
        kind: "analysis_starred",
        ...payload,
        ts: Date.now(),
      }),
      sourceSummary: starred ? "starred" : "unstarred",
      payload,
    });
  } catch (err) {
    console.error("[wiki] enqueueAnalysisStarred failed:", err);
  }
}

// ---------------------------------------------------------------------------
// todo_created — explicit user action item.
// ---------------------------------------------------------------------------

export async function enqueueTodoCreated(
  db: SupabaseClient,
  userId: string,
  analysisId: string,
  todoId: string,
  title: string,
): Promise<void> {
  if (!isEnabled()) return;
  try {
    const payload = { analysis_id: analysisId, todo_id: todoId, title };
    await insertSourceAndJob({
      db,
      userId,
      sourceKind: "todo_created",
      analysisId,
      eventTable: "analysis_todos",
      eventId: todoId,
      contentHash: hashPayload({ kind: "todo_created", ...payload }),
      sourceSummary: shorten(title, 200),
      payload,
    });
  } catch (err) {
    console.error("[wiki] enqueueTodoCreated failed:", err);
  }
}

// ---------------------------------------------------------------------------
// profile_updated — onboarding/context edits. Reads the current row back so
// the snapshot reflects what landed in the DB, not whatever the request body
// claimed.
// ---------------------------------------------------------------------------

export async function enqueueProfileUpdated(
  db: SupabaseClient,
  userId: string,
): Promise<void> {
  if (!isEnabled()) return;
  try {
    const [{ data: ctx }, { data: user }] = await Promise.all([
      db
        .from("user_contexts")
        .select("role, goal, content_preferences, extended_context")
        .eq("user_id", userId)
        .maybeSingle(),
      db
        .from("users")
        .select("first_name, stance, intention, pattern_to_stop")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const payload = {
      user_id: userId,
      context: ctx ?? null,
      user: user ?? null,
    };
    await insertSourceAndJob({
      db,
      userId,
      sourceKind: "profile_updated",
      contentHash: hashPayload({ kind: "profile_updated", ...payload }),
      sourceSummary: "profile updated",
      payload,
    });
  } catch (err) {
    console.error("[wiki] enqueueProfileUpdated failed:", err);
  }
}
