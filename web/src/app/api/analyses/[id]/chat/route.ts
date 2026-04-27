import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";
import { HUMANIZER_RULES } from "@/lib/humanizer-rules";
import { formatSubjectResearchForPrompt, type SubjectResearch } from "@/lib/subject-research";
import { consumeChatMessage, FREE_DAILY_CHAT_LIMIT } from "@/lib/chat-usage";

const CHAT_SYSTEM_PROMPT = `You're a friend who knows what the saved post is about — and you can look things up on the web when the reader's question reaches past what's in the source.

You don't know who the reader is. Don't assume their profession or what they're building. Don't filter answers through a CV — talk about the SUBJECT, not about them.

This is a conversation, not a report. Tight answers. Two or three short paragraphs at most for substantive questions, one paragraph for simple ones. No "Here's what I'll do" preambles. No "Let me know if you want..." closers. Just the answer.

WHEN TO USE web_search:
- The reader asks for the latest version, current price, or live status of something.
- The reader asks "where is X" / "how do I install X" and the source didn't include the URL.
- The reader asks how the subject compares to another tool you weren't told about.
- The reader asks a follow-up about a related thing the source only briefly mentioned.

WHEN NOT TO use web_search:
- Question is fully answerable from the existing context (verdict + transcript + caption + subject research).
- General opinion / "what do you think" — answer from your own read.
- The reader's question is about their own state ("did I save this last week?") — that's not for you to look up.

When you do search, say briefly what you found and cite the URL. Don't dump search results — distill.

Guidelines:
- Be specific — quote or paraphrase actual content when relevant.
- If the answer isn't in the content AND a search wouldn't help, say so plainly: "wasn't covered" — then give your honest take, distinguishing "this was in the content" from "my read on it."
- If they ask something implementable, give the exact first step, command, or URL — from the source if it's there, from search if not.
- Never invent links, prices, or features that aren't in the source OR what you found searching.
- No "Great question!" openers. No personalisation by role.

## Actions you can take

You can perform real actions for the user. When the user asks you to add a task or save to Notion, confirm tersely (one short sentence) what you'll do, then include the action tag at the END.

Available actions:
- Add a task: [ACTION:add_task:Task title here]
- Save to Notion: [ACTION:save_notion]

Rules for actions:
- Only include an action tag when the user explicitly asks for it ("add this", "save to notion", "remind me to...").
- Never include action tags in normal conversation.
- Confirmation is ONE short sentence — not a multi-step plan.
  GOOD: "Adding a task: Test Kimi K2.6 with a Python prime-filter prompt."
  BAD: "Here's what I'll do: First, I'll add a task… Second…"
- Always explain what you're about to do BEFORE the tag, in one sentence.
- One action per message maximum.
- Keep task titles concise (under 80 chars).
- If the user says something vague ("I should do that"), ask them to clarify before adding.

${HUMANIZER_RULES}`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnalysisRow {
  verdict: string | null;
  transcript: string | null;
  visual_summary: string | null;
  caption: string | null;
  platform: string;
  source_url: string;
  metadata: Record<string, unknown> | null;
  subject_research: SubjectResearch | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabase();

  // Free users get a daily taste of chat (FREE_DAILY_CHAT_LIMIT messages).
  // Premium is unlimited. We bump the counter atomically before generation so
  // a half-finished stream still counts — keeps the gate honest if the model
  // errors mid-flight.
  const { data: userRow } = await db
    .from("users")
    .select("premium")
    .eq("id", session.sub)
    .single();
  const isPaidPremium = !!userRow?.premium;

  const usage = await consumeChatMessage(db, session.sub, isPaidPremium);
  if (usage.locked) {
    return NextResponse.json(
      {
        error: "daily_limit",
        message: `You've used your ${FREE_DAILY_CHAT_LIMIT} daily chats. Upgrade for unlimited.`,
        resetAt: usage.resetAt,
        remaining: 0,
        limit: usage.limit,
      },
      { status: 429 },
    );
  }

  const { messages } = (await request.json()) as { messages: ChatMessage[] };
  if (!messages?.length) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  const { id } = await params;

  const { data: analysis } = await db
    .from("analyses")
    .select("verdict, transcript, visual_summary, caption, platform, source_url, metadata, subject_research")
    .eq("id", id)
    .eq("user_id", session.sub)
    .single<AnalysisRow>();

  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contextParts: string[] = [];
  contextParts.push("\n--- CONTENT BEING DISCUSSED ---");
  contextParts.push(`Platform: ${analysis.platform}`);
  contextParts.push(`URL: ${analysis.source_url}`);
  if (analysis.verdict) contextParts.push(`AI Verdict: ${analysis.verdict}`);
  if (analysis.transcript) contextParts.push(`Transcript: ${analysis.transcript.slice(0, 4000)}`);
  if (analysis.visual_summary) contextParts.push(`Visual summary: ${analysis.visual_summary.slice(0, 1500)}`);
  if (analysis.caption) contextParts.push(`Creator's caption: ${analysis.caption}`);
  if (analysis.metadata) {
    const meta = analysis.metadata as Record<string, unknown>;
    const metaParts: string[] = [];
    if (meta.authorName) metaParts.push(`Author: ${meta.authorName}`);
    if (meta.views) metaParts.push(`Views: ${meta.views}`);
    if (meta.like_count) metaParts.push(`Likes: ${meta.like_count}`);
    if (metaParts.length) contextParts.push(`Metadata: ${metaParts.join(", ")}`);
  }

  // Apr 26 — preload the same web research the verdict was grounded in. Means
  // the model rarely needs to search for the canonical URL — it's already there.
  const research = formatSubjectResearchForPrompt(analysis.subject_research);
  if (research) contextParts.push(`\n${research}`);

  const systemMessage = `${CHAT_SYSTEM_PROMPT}\n\n${contextParts.join("\n")}`;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  // Build Responses API input — system + conversation history
  const input: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemMessage },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Stream the response as SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const result = await openai.responses.create({
          model: "gpt-4.1",
          tools: [{ type: "web_search" }],
          input,
          max_output_tokens: 1200,
          stream: true,
        });

        let fullText = "";
        for await (const event of result) {
          // Text token deltas
          if (event.type === "response.output_text.delta") {
            const delta = (event as { delta?: string }).delta ?? "";
            fullText += delta;
            send("text_delta", { delta });
            continue;
          }
          // Web search lifecycle
          if (event.type === "response.web_search_call.in_progress") {
            send("tool_start", { tool: "web_search" });
            continue;
          }
          if (event.type === "response.web_search_call.searching") {
            send("tool_searching", { tool: "web_search" });
            continue;
          }
          if (event.type === "response.web_search_call.completed") {
            send("tool_done", { tool: "web_search" });
            continue;
          }
          if (event.type === "response.failed" || event.type === "error") {
            send("error", { message: "Generation failed" });
            controller.close();
            return;
          }
          if (event.type === "response.completed") {
            send("done", { text: fullText });
            controller.close();
            return;
          }
        }
        // Stream ended without explicit completed event — emit done anyway
        send("done", { text: fullText });
        controller.close();
      } catch (err) {
        console.error("[chat stream] error:", err);
        send("error", { message: err instanceof Error ? err.message : "Unknown error" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
