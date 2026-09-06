import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isLocalStudioRequest, readLocalAnalysis, localStudioRoot, writeLocalJson } from "@/lib/local-studio";
import { buildSourceEvidence, PLAN_MODES } from "@/lib/execution-plan";
import { parseReplicationDraft, requestReplicationDraft } from "@/lib/plan-generator";
import { readBoundedJson } from "@/lib/bounded-json";

export const runtime = "nodejs";
let active = false;

export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  if (active) return NextResponse.json({ error: "A local plan is already being prepared." }, { status: 429 });
  active = true;
  try {
    // Local studio is opt-in and loopback-only. Never bypass production account routes.
    let body;
    try { body = await readBoundedJson(request) as { goal: string; mode: (typeof PLAN_MODES)[number] }; } catch { return NextResponse.json({ error: "Invalid or oversized JSON." }, { status: 400 }); }
    if (!body || typeof body !== "object" || Object.keys(body).some(k => !["goal", "mode"].includes(k)) || typeof body.goal !== "string" || body.goal.trim().length < 8 || body.goal.length > 1_200 || /[\u0000-\u001f\u007f]/.test(body.goal) || !PLAN_MODES.includes(body.mode)) return NextResponse.json({ error: "Choose an outcome and describe it in 8–1,200 characters." }, { status: 400 });
    const analysis = await readLocalAnalysis();
    if (!analysis) return NextResponse.json({ error: "Capture a real source first. Local analysis is not ready." }, { status: 409 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "The local server needs OPENAI_API_KEY." }, { status: 503 });
    const { evidence, warnings } = buildSourceEvidence(analysis);
    if (!evidence.length) return NextResponse.json({ error: "No source evidence was captured." }, { status: 422 });
    const day = new Date().toISOString().slice(0, 10);
    let count = 0;
    try { const previous = JSON.parse(await fs.readFile(path.join(localStudioRoot, "local-plan-usage.json"), "utf8")); if (previous.day === day) count = previous.count; } catch { /* first local request */ }
    if (count >= 20) return NextResponse.json({ error: "Today's 20 local planning attempts have been used." }, { status: 429 });
    await writeLocalJson("local-plan-usage.json", { day, count: count + 1 });
    const context = { id: analysis.id, goal: body.goal.trim(), mode: body.mode, sourceUrl: analysis.source_url, evidence, warnings };
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90_000, maxRetries: 0 });
    const response = await requestReplicationDraft(params => client.chat.completions.create(params), context);
    const choice = response.choices[0];
    if (!choice || choice.finish_reason !== "stop" || choice.message.refusal || !choice.message.content) return NextResponse.json({ error: "The model did not finish a plan. Narrow the goal and retry." }, { status: 502 });
    const plan = parseReplicationDraft(choice.message.content, context);
    await writeLocalJson("local-plan.json", plan);
    return NextResponse.json({ plan, status: "prepared", usage: { remaining: 19 - count } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The local plan could not be prepared or validated. No task was executed." }, { status: 502 });
  } finally { active = false; }
}
