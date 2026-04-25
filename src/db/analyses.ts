import { supabase } from "./client.js";
import type { Platform, FrameAnalysis } from "../pipeline/types.js";

export interface CreateAnalysisInput {
  userId: string;
  sourceUrl: string;
  platform: Platform;
}

export async function create(input: CreateAnalysisInput): Promise<string> {
  const { data, error } = await supabase
    .from("analyses")
    .insert({
      user_id: input.userId,
      source_url: input.sourceUrl,
      platform: input.platform,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create analysis: ${error.message}`);
  return data.id;
}

export async function updateStatus(id: string, status: string): Promise<void> {
  await supabase.from("analyses").update({ status }).eq("id", id);
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
    errorMessage?: string;
    status: string;
    subjectResearch?: Record<string, unknown> | null;
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

  // Apr 26 — subject_research column was added in migration 016. If the
  // migration hasn't been applied yet (or the field is undefined), don't
  // include the column in the update so the write doesn't 400 on production.
  if (result.subjectResearch !== undefined) {
    payload.subject_research = result.subjectResearch;
  }

  const { error } = await supabase.from("analyses").update(payload).eq("id", id);

  if (error && /subject_research/.test(error.message)) {
    // Migration not yet applied — retry without the new column so the analysis
    // still completes. Logged so we notice if 016 hasn't been deployed.
    console.warn("[analyses.updateResult] subject_research column missing — retrying without it. Run migration 016_subject_research.sql.");
    delete payload.subject_research;
    await supabase.from("analyses").update(payload).eq("id", id);
  }
}

export async function updateIntent(id: string, intent: string): Promise<void> {
  await supabase.from("analyses").update({ verdict_intent: intent }).eq("id", id);
}

export async function getById(id: string) {
  const { data } = await supabase.from("analyses").select("*").eq("id", id).single();
  return data;
}

// ── State machine: saved → tried | set_aside ────────────────────────────────
// Phase 2 (transformation-plan §6). Both terminal-good states.

export async function markTried(id: string): Promise<void> {
  await supabase
    .from("analyses")
    .update({ tried_at: new Date().toISOString(), set_aside_at: null })
    .eq("id", id);
}

export async function markSetAside(id: string): Promise<void> {
  await supabase
    .from("analyses")
    .update({ set_aside_at: new Date().toISOString(), tried_at: null })
    .eq("id", id);
}

export async function revertToSaved(id: string): Promise<void> {
  await supabase
    .from("analyses")
    .update({ tried_at: null, set_aside_at: null })
    .eq("id", id);
}

export async function getOwnerId(id: string): Promise<string | null> {
  const { data } = await supabase
    .from("analyses")
    .select("user_id")
    .eq("id", id)
    .single();
  return data?.user_id ?? null;
}
