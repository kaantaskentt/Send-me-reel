import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSession } from "./auth";
import { getSupabase } from "./supabase";
import { buildSourceEvidence, PLAN_MODES } from "./execution-plan";

import { reserveDailyAiRequest, type DailyAiReservation } from "./daily-ai-usage";

import { requestReplicationDraft, parseReplicationDraft, type CompletionResult } from "./plan-generator";
export interface ReplicationDependencies {
  session: () => Promise<{ sub: string } | null>;
  database: typeof getSupabase;
  configured: () => boolean;
  reserve: (db: ReturnType<typeof getSupabase>, userId: string) => Promise<DailyAiReservation>;
  complete: (params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming) => Promise<CompletionResult>;
}
const defaults: ReplicationDependencies = {
  session: getSession, database: getSupabase, configured: () => !!process.env.OPENAI_API_KEY,
  reserve: reserveDailyAiRequest,
  complete: (params) => new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 75_000, maxRetries: 0 }).chat.completions.create(params),
};

// Limits overlapping requests within a worker. It is not a cross-instance billing quota.
const activeUsers = new Set<string>();

async function readBody(request: NextRequest): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("A request body is required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8_000) { await reader.cancel(); throw new Error("Request is too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function createReplicationHandler(overrides: Partial<ReplicationDependencies> = {}) {
 const deps = { ...defaults, ...overrides };
 return async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await deps.session();
  if (!session) return NextResponse.json({ error: "Sign in to prepare a plan." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  const { id } = await params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
  let goal: string;
  let mode: (typeof PLAN_MODES)[number];
  try {
    const body = await readBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid request");
    const fields = body as Record<string, unknown>;
    if (Object.keys(fields).some((key) => key !== "goal" && key !== "mode")) throw new Error("Unexpected fields");
    if (typeof fields.goal !== "string" || fields.goal.trim().length < 8 || fields.goal.length > 1_200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(fields.goal)) throw new Error("Describe your desired result in 8–1,200 characters.");
    if (!PLAN_MODES.includes(fields.mode as typeof mode)) throw new Error("Choose a supported task type.");
    goal = fields.goal.trim(); mode = fields.mode as typeof mode;
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? "Invalid JSON request." : error instanceof Error ? error.message : "Invalid request." }, { status: 400 });
  }
  if (activeUsers.has(session.sub)) return NextResponse.json({ error: "A plan is already being prepared. Wait for it to finish." }, { status: 429 });
  activeUsers.add(session.sub);
  try {
    const db = deps.database();
    const { data: analysis, error } = await db.from("analyses")
      .select("id, source_url, platform, status, transcript, frame_descriptions, caption, metadata")
      .eq("id", id).eq("user_id", session.sub).single();
    if (error || !analysis) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    if (analysis.status !== "done") return NextResponse.json({ error: "Wait until this analysis finishes before preparing a plan." }, { status: 409 });
    const { evidence, warnings } = buildSourceEvidence(analysis);
    if (!evidence.length) return NextResponse.json({ error: "This analysis has no captured transcript, frames, or source text. Analyze the source again before planning." }, { status: 422 });
    if (!deps.configured()) return NextResponse.json({ error: "Plan generation is not configured. The server needs OPENAI_API_KEY." }, { status: 503 });
    const usage = await deps.reserve(db, session.sub);
    if (!usage.allowed) return NextResponse.json({ error: "Daily planning allowance reached. Free chat shares this allowance.", resetAt: usage.resetAt }, { status: 429 });
    const response = await requestReplicationDraft(deps.complete, { goal, mode, sourceUrl: analysis.source_url, evidence, warnings });
    const choice = response.choices[0];
    if (!choice || choice.finish_reason !== "stop" || choice.message.refusal || !choice.message.content) return NextResponse.json({ error: "The model did not produce a complete plan. Try a narrower goal." }, { status: 502 });
    let plan;
    try {
      plan = parseReplicationDraft(choice.message.content, { id, goal, mode, sourceUrl: analysis.source_url, evidence, warnings });
    } catch {
      return NextResponse.json({ error: "The plan failed source-reference or format checks. Try again with a more specific goal." }, { status: 502 });
    }
    return NextResponse.json({ plan, status: "prepared", usage: { remaining: usage.remaining, resetAt: usage.resetAt } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Provider/database errors can contain private request content. Do not return or log it.
    return NextResponse.json({ error: "Plan generation is temporarily unavailable. Your analysis is unchanged." }, { status: 502 });
  } finally { activeUsers.delete(session.sub); }
}

}
