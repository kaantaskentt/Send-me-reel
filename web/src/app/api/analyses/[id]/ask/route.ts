import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";

const ASK_PROMPT = `You're the user's sharp friend. They already got the breakdown and the deep dive. Now they're asking a follow-up — answer like you're in a conversation, not writing a report.

You know this user — their role, what they're building, what they care about. Tailor your answer to their specific context. If they ask "how would I use this?", answer in terms of THEIR project, not generically.

Pull from the actual transcript/content. If they ask how to do something, give the first concrete step — not a strategy overview. If the answer isn't in the content, say "wasn't covered in the content" and give your honest take if you have one — but clearly distinguish between "this was in the content" and "this is my take."

Rules:
- Be specific — reference what was actually said or shown
- Under 200 words. Tighter is better.
- No "Great question!" — just answer it
- If they ask something implementable, give the exact command, URL, or first step
- Reference their project/role when connecting advice to their work
- Never invent links, prices, or features that weren't in the source material`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is premium
  const db = getSupabase();
  const { data: user } = await db
    .from("users")
    .select("premium")
    .eq("id", session.sub)
    .single();

  if (!user?.premium) {
    return NextResponse.json({ error: "Premium required" }, { status: 403 });
  }

  const { question } = await request.json();
  if (!question?.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  const { id } = await params;

  // Fetch the analysis
  const { data: analysis } = await db
    .from("analyses")
    .select("verdict, transcript, visual_summary, caption, platform")
    .eq("id", id)
    .eq("user_id", session.sub)
    .single();

  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get user context
  const { data: context } = await db
    .from("user_contexts")
    .select("role, goal, content_preferences, extended_context")
    .eq("user_id", session.sub)
    .single();

  // Build context for the AI
  const parts: string[] = [];

  if (context) {
    parts.push("--- USER PROFILE ---");
    parts.push(`Role: ${context.role}`);
    parts.push(`Focus: ${context.goal}`);
    if (context.content_preferences) {
      parts.push(`Priorities: ${context.content_preferences}`);
    }
    if (context.extended_context) {
      parts.push(`Extended profile: ${context.extended_context.slice(0, 500)}`);
    }
  }

  parts.push("\n--- CONTENT ---");
  parts.push(`Platform: ${analysis.platform}`);
  if (analysis.verdict) parts.push(`Verdict: ${analysis.verdict}`);
  if (analysis.transcript) parts.push(`Transcript: ${analysis.transcript.slice(0, 3000)}`);
  if (analysis.visual_summary) parts.push(`Visual: ${analysis.visual_summary.slice(0, 1000)}`);
  if (analysis.caption) parts.push(`Caption: ${analysis.caption}`);

  parts.push(`\n--- USER QUESTION ---\n${question}`);

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 500,
      messages: [
        { role: "system", content: ASK_PROMPT },
        { role: "user", content: parts.join("\n") },
      ],
    });

    const answer = response.choices[0]?.message?.content?.trim();
    if (!answer) {
      return NextResponse.json({ error: "No answer generated" }, { status: 500 });
    }

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Ask error:", err);
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
  }
}
