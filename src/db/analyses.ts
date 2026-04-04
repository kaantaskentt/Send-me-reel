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
  },
): Promise<void> {
  await supabase
    .from("analyses")
    .update({
      transcript: result.transcript,
      frame_descriptions: result.frameDescriptions,
      visual_summary: result.visualSummary,
      caption: result.caption,
      metadata: result.metadata,
      verdict: result.verdict,
      error_message: result.errorMessage,
      status: result.status,
      completed_at: result.status === "done" ? new Date().toISOString() : undefined,
    })
    .eq("id", id);
}

export async function updateIntent(id: string, intent: string): Promise<void> {
  await supabase.from("analyses").update({ verdict_intent: intent }).eq("id", id);
}

export async function getById(id: string) {
  const { data } = await supabase.from("analyses").select("*").eq("id", id).single();
  return data;
}
