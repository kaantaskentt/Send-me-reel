import { supabase } from "./client.js";
import { randomUUID } from "node:crypto";
import { ServiceError } from "../pipeline/types.js";
import type { Platform, FrameAnalysis } from "../pipeline/types.js";

export interface CreateAnalysisInput {
  userId: string;
  sourceUrl: string;
  platform: Platform;
  userNote?: string;
  analysisId?: string;
}

export async function create(input: CreateAnalysisInput): Promise<string> {
  const { data, error } = await supabase.rpc("create_analysis_with_credit", {
    p_user_id: input.userId,
    p_source_url: input.sourceUrl,
    p_platform: input.platform,
    p_source: "telegram",
    p_note: input.userNote ?? null,
    p_analysis_id: input.analysisId ?? randomUUID(),
  });
  if (error?.message === "INSUFFICIENT_CREDITS") throw new ServiceError("INSUFFICIENT_CREDITS", "No analyses remaining", false);
  if (error) throw new ServiceError("BILLING_UNAVAILABLE", `Atomic analysis submission failed: ${error.message}`, true);
  if (typeof data !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data)) {
    throw new ServiceError("BILLING_UNAVAILABLE", "Atomic analysis submission returned an invalid result", true);
  }
  return data;
}

export async function updateStatus(id: string, status: string): Promise<void> {
  await persistUpdate(id, { status });
}

async function persistUpdate(id: string, payload: Record<string, unknown>): Promise<void> {
  let query = supabase.from("analyses").update(payload).eq("id", id);
  // A late response from a timed-out attempt must not resurrect a failed analysis.
  // An explicit retry first transitions the row back to pending.
  if (payload.status && payload.status !== "failed" && payload.status !== "pending") query = query.neq("status", "failed");
  const { error } = await query.select("id").single();
  if (error) throw new Error(`Failed to update analysis ${id}: ${error.message}`);
}

export async function updateResult(
  id: string,
  result: {
    transcript?: string | null;
    frameDescriptions?: FrameAnalysis[];
    visualSummary?: string;
    caption?: string;
    metadata?: Record<string, unknown>;
    verdict?: string;
    errorMessage?: string | null;
    status: string;
    subjectResearch?: Record<string, unknown> | null;
    contentType?: string | null;
    actionLane?: string | null;
    costUsd?: number | null;
  },
): Promise<void> {
  const payload: Record<string, unknown> = {
    transcript: result.transcript,
    frame_descriptions: result.frameDescriptions,
    visual_summary: result.visualSummary,
    caption: result.caption,
    metadata: result.metadata,
    verdict: result.verdict,
    error_message: result.errorMessage,
    status: result.status,
    completed_at: result.status === "done" ? new Date().toISOString() : undefined,
  };

  if (result.costUsd !== undefined) {
    payload.cost_usd = result.costUsd;
  }

  // Apr 26 — subject_research column was added in migration 016. If the
  // migration hasn't been applied yet (or the field is undefined), don't
  // include the column in the update so the write doesn't 400 on production.
  if (result.subjectResearch !== undefined) {
    payload.subject_research = result.subjectResearch;
  }
  if (result.contentType !== undefined) {
    payload.content_type = result.contentType;
  }
  if (result.actionLane !== undefined) {
    payload.action_lane = result.actionLane;
  }

  try {
    await persistUpdate(id, payload);
  } catch (error) {
    if (error instanceof Error && /subject_research/.test(error.message) && /column|schema cache/i.test(error.message)) {
      console.warn("[analyses.updateResult] subject_research column missing — retrying without it. Run migration 016_subject_research.sql.");
      delete payload.subject_research;
      await persistUpdate(id, payload);
    } else {
      throw error;
    }
  }
}

export async function updateIntent(id: string, intent: string): Promise<void> {
  await persistUpdate(id, { verdict_intent: intent });
}

export async function getById(id: string) {
  const { data } = await supabase.from("analyses").select("*").eq("id", id).single();
  return data;
}

// ── State machine: saved → tried | set_aside ────────────────────────────────
// Phase 2 (transformation-plan §6). Both terminal-good states.

export async function markTried(id: string): Promise<void> {
  await persistUpdate(id, { tried_at: new Date().toISOString(), set_aside_at: null });
}

export async function markSetAside(id: string): Promise<void> {
  await persistUpdate(id, { set_aside_at: new Date().toISOString(), tried_at: null });
}

export async function revertToSaved(id: string): Promise<void> {
  await persistUpdate(id, { tried_at: null, set_aside_at: null });
}

export async function getOwnerId(id: string): Promise<string | null> {
  const { data } = await supabase
    .from("analyses")
    .select("user_id")
    .eq("id", id)
    .single();
  return data?.user_id ?? null;
}
