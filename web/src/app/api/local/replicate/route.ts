import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isLocalStudioRequest, readLocalAnalysis, localStudioRoot, writeLocalJson } from "@/lib/local-studio";
import { PLAN_MODES } from "@/lib/execution-plan";
import { generateReplicationPlan } from "@/lib/plan-generator";
import { readBoundedJson } from "@/lib/bounded-json";
import { readLocalLibrarySource } from "@/lib/local-library";
import { readWorkspace } from "@/lib/local-workspace";
import { buildLocalTaskEvidence } from "@/lib/local-task-context";

export const runtime = "nodejs";
let active = false;

export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  if (active) return NextResponse.json({ error: "A local plan is already being prepared." }, { status: 429 });
  active = true;
  try {
    // Local studio is opt-in and loopback-only. Never bypass production account routes.
    let body;
    try { body = await readBoundedJson(request) as { goal: string; mode: (typeof PLAN_MODES)[number]; analysisId?: string; contextSourceIds?: string[] }; } catch { return NextResponse.json({ error: "Invalid or oversized JSON." }, { status: 400 }); }
    if (!body || typeof body !== "object" || Object.keys(body).some(k => !["goal", "mode", "analysisId", "contextSourceIds"].includes(k)) || typeof body.goal !== "string" || body.goal.trim().length < 8 || body.goal.length > 1_200 || /[\u0000-\u001f\u007f]/.test(body.goal) || !PLAN_MODES.includes(body.mode) || (body.analysisId !== undefined && typeof body.analysisId !== "string") || (body.contextSourceIds !== undefined && (!Array.isArray(body.contextSourceIds) || body.contextSourceIds.length > 3 || body.contextSourceIds.some(id => typeof id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(id))))) return NextResponse.json({ error: "Choose an outcome and describe it in 8–1,200 characters, with up to three saved reference sources." }, { status: 400 });
    const analysis = await readLocalAnalysis();
    if (!analysis) return NextResponse.json({ error: "Capture a real source first. Local analysis is not ready." }, { status: 409 });
    if (body.analysisId !== undefined && body.analysisId !== analysis.id) return NextResponse.json({ code: "SOURCE_CHANGED", error: "Another link is open now. Open it before choosing a task." }, { status: 409 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "The local server needs OPENAI_API_KEY." }, { status: 503 });
    const otherSources = await Promise.all((body.contextSourceIds ?? []).map(id => readLocalLibrarySource(localStudioRoot, id)));
    if (otherSources.some(source => !source)) return NextResponse.json({ error: "One of this task's saved sources is no longer available. Reopen the conversation and choose the references again." }, { status: 409 });
    const { profile } = await readWorkspace();
    const { evidence, warnings } = buildLocalTaskEvidence(analysis, otherSources.filter(source => source !== null), profile, body.goal);
    if (!evidence.length) return NextResponse.json({ error: "No source evidence was captured." }, { status: 422 });
    const day = new Date().toISOString().slice(0, 10);
    let count = 0;
    try { const previous = JSON.parse(await fs.readFile(path.join(localStudioRoot, "local-plan-usage.json"), "utf8")); if (previous.day === day) count = previous.count; } catch { /* first local request */ }
    if (count >= 20) return NextResponse.json({ error: "Today's 20 local planning attempts have been used." }, { status: 429 });
    await writeLocalJson("local-plan-usage.json", { day, count: count + 1 });
    const context = { id: analysis.id, goal: body.goal.trim(), mode: body.mode, sourceUrl: analysis.source_url, evidence, warnings };
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90_000, maxRetries: 0 });
    const plan = await generateReplicationPlan(params => client.chat.completions.create(params), context);
    await writeLocalJson("local-plan.json", plan);
    return NextResponse.json({ plan, status: "prepared", usage: { remaining: 19 - count } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && ["PLAN_INCOMPLETE", "PLAN_INVALID"].includes(error.message) ? error.message : error instanceof OpenAI.APIConnectionTimeoutError ? "PLAN_TIMEOUT" : error instanceof OpenAI.APIError ? "PLAN_PROVIDER_ERROR" : "PLAN_PREPARATION_FAILED";
    await writeLocalJson("local-plan-failure.json", { at: new Date().toISOString(), code, ...(error instanceof OpenAI.APIError ? { status: error.status } : {}) }).catch(() => {});
    return NextResponse.json({ code, error: code === "PLAN_TIMEOUT" ? "The AI took too long. Try again; nothing has started." : code === "PLAN_PROVIDER_ERROR" ? "Your AI service couldn’t answer. Try again in a moment." : "Couldn’t work out the steps. Try a smaller task; nothing has started." }, { status: 502 });
  } finally { active = false; }
}
