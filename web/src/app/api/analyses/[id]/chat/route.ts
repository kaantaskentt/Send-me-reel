import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";

const CHAT_SYSTEM_PROMPT = `You're the user's sharp friend who has watched this content end-to-end. You know the transcript, what was on screen, the creator's caption, and how it all fits together. You also know the user — their role, what they're building, what they care about.

This is a conversation, not a report. Talk naturally. Reference what was actually said or shown in the content. When the user asks "how would I use this?", answer in terms of THEIR specific project and goals, not generically.

Guidelines:
- Be specific — quote or paraphrase actual content when relevant
- Keep responses concise but don't force artificial brevity — say what needs saying
- Reference earlier parts of the conversation when it adds context
- If the answer isn't in the content, say so and give your honest take — clearly distinguish between "this was in the content" and "this is my take"
- If they seem stuck, suggest a follow-up angle they might not have considered
- If they ask something implementable, give the exact first step, command, or URL
- Never invent links, prices, or features that weren't in the source material
- No "Great question!" openers — just answer`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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

  // Premium check
  const { data: user } = await db
    .from("users")
    .select("premium")
    .eq("id", session.sub)
    .single();

  if (!user?.premium) {
    return NextResponse.json({ error: "Premium required" }, { status: 403 });
  }

  const { messages } = (await request.json()) as { messages: ChatMessage[] };
  if (!messages?.length) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  const { id } = await params;

  // Fetch analysis
  const { data: analysis } = await db
    .from("analyses")
    .select("verdict, transcript, visual_summary, caption, platform, source_url, metadata")
    .eq("id", id)
    .eq("user_id", session.sub)
    .single();

  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch user context
  const { data: context } = await db
    .from("user_contexts")
    .select("role, goal, content_preferences, extended_context")
    .eq("user_id", session.sub)
    .single();

  // Build system context
  const contextParts: string[] = [];

  if (context) {
    contextParts.push("--- USER PROFILE ---");
    contextParts.push(`Role: ${context.role}`);
    contextParts.push(`Focus: ${context.goal}`);
    if (context.content_preferences) contextParts.push(`Interests: ${context.content_preferences}`);
    if (context.extended_context) contextParts.push(`Background: ${context.extended_context.slice(0, 500)}`);
  }

  contextParts.push("\n--- CONTENT BEING DISCUSSED ---");
  contextParts.push(`Platform: ${analysis.platform}`);
  contextParts.push(`URL: ${analysis.source_url}`);
  if (analysis.verdict) contextParts.push(`AI Verdict: ${analysis.verdict}`);
  if (analysis.transcript) contextParts.push(`Transcript: ${analysis.transcript.slice(0, 4000)}`);
  if (analysis.visual_summary) contextParts.push(`Visual summary: ${analysis.visual_summary.slice(0, 1500)}`);
  if (analysis.caption) contextParts.push(`Creator's caption: ${analysis.caption}`);
  if (analysis.metadata) {
    const meta = analysis.metadata as Record<string, unknown>;
    const metaParts = [];
    if (meta.authorName) metaParts.push(`Author: ${meta.authorName}`);
    if (meta.views) metaParts.push(`Views: ${meta.views}`);
    if (meta.like_count) metaParts.push(`Likes: ${meta.like_count}`);
    if (metaParts.length) contextParts.push(`Metadata: ${metaParts.join(", ")}`);
  }

  const systemMessage = `${CHAT_SYSTEM_PROMPT}\n\n${contextParts.join("\n")}`;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 800,
      messages: [
        { role: "system", content: systemMessage },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
    });

    const message = response.choices[0]?.message?.content?.trim();
    if (!message) {
      return NextResponse.json({ error: "No response generated" }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
