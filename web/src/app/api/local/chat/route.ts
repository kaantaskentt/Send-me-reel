import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isLocalStudioRequest, localStudioRoot, readLocalAnalysis } from "@/lib/local-studio";
import { readBoundedJson } from "@/lib/bounded-json";
import { answerContent, contentMessage, readConversation, writeConversation } from "@/lib/local-conversation";
import { quickTakePrompt } from "@/lib/content-conversation";

export const runtime = "nodejs";
let active = false;
export async function GET(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers)) return new NextResponse(null, { status: 404 });
  const analysis = await readLocalAnalysis();
  if (!analysis) return NextResponse.json({ error: "Capture content first." }, { status: 409 });
  return NextResponse.json(await readConversation(analysis.id), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  if (active) return NextResponse.json({ error: "Still working on your previous question. Give it a moment." }, { status: 409 });
  active = true;
  try {
    let body: { analysisId: string; message?: string; brief?: boolean };
    try { body = await readBoundedJson(request, 9000) as typeof body; } catch { return NextResponse.json({ error: "Your message is too large." }, { status: 400 }); }
    if (!body || Object.keys(body).some(k => !["analysisId", "message", "brief"].includes(k)) || typeof body.analysisId !== "string" || (body.brief !== undefined && typeof body.brief !== "boolean") || (!body.brief && (typeof body.message !== "string" || !body.message.trim() || body.message.length > 4000))) return NextResponse.json({ error: "Write a question of up to 4,000 characters." }, { status: 400 });
    const analysis = await readLocalAnalysis();
    if (!analysis || analysis.id !== body.analysisId) return NextResponse.json({ error: "Your source changed. Refresh before asking about the new content." }, { status: 409 });
    const conversation = await readConversation(analysis.id);
    if (body.brief && conversation.messages.length) return NextResponse.json(conversation);
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Add OPENAI_API_KEY to the local server to enable chat." }, { status: 503 });
    const usageFile = path.join(localStudioRoot, "local-chat-usage.json");
    const day = new Date().toISOString().slice(0, 10);
    let count = 0;
    try { const previous = JSON.parse(await fs.readFile(usageFile, "utf8")); if (previous.day === day && Number.isInteger(previous.count)) count = previous.count; } catch { /* first request */ }
    if (count >= 100) return NextResponse.json({ error: "Today's 100 local chat turns are used. Your conversations are saved." }, { status: 429 });
    await fs.mkdir(localStudioRoot, { recursive: true, mode: 0o700 });
    await fs.writeFile(usageFile, JSON.stringify({ day, count: count + 1 }), { mode: 0o600 });
    const message = body.brief ? quickTakePrompt : body.message!.trim();
    const result = await answerContent(analysis, conversation, message);
    if (body.brief) result.reply.actions = [];
    // A completed reply belongs to its captured source even if another capture
    // finishes during the model request. Never merge two sources' conversations.
    if (!body.brief) conversation.messages.push(contentMessage("user", message));
    conversation.messages.push({ ...contentMessage("assistant", result.reply.answer), reply: result.reply, activity: result.activity });
    if (conversation.messages.length > 120) conversation.messages = conversation.messages.slice(-120);
    await writeConversation(conversation);
    await fs.appendFile(path.join(localStudioRoot, "chat-usage.jsonl"), JSON.stringify({ at: new Date().toISOString(), analysisId: analysis.id, ...result.usage }) + "\n", { mode: 0o600 });
    return NextResponse.json(conversation, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The assistant could not finish this reply. Your saved conversation is intact. Try a smaller question; no computer action was started." }, { status: 502 });
  } finally { active = false; }
}
