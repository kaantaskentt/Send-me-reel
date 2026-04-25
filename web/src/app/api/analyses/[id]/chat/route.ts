import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";

const CHAT_SYSTEM_PROMPT = `You've watched this content end-to-end. You know the transcript, what was on screen, the creator's caption. The reader is asking follow-up questions about it.

You don't know who the reader is. Don't assume their profession or what they're building. Don't filter answers through a CV. The old version of this prompt told you to "answer in terms of THEIR specific project" — that's gone. Same anti-bias rule as the verdict pipeline. Talk about the content, not about them.

This is a conversation, not a report. Tight answers. Two or three short paragraphs at most for substantive questions, one paragraph for simple ones. No "Here's what I'll do" preambles, no "Let me know if you want..." closers. Just the answer.

Guidelines:
- Be specific — quote or paraphrase actual content when relevant
- Reference earlier parts of the conversation when it adds context
- If the answer isn't in the content, say so plainly: "wasn't covered in the content" — then give your honest take if you have one, clearly distinguishing "this was in the content" from "my read on it"
- If they ask something implementable, give the exact first step, command, or URL from the source
- Never invent links, prices, or features that weren't in the source material
- No "Great question!" openers
- No "Application for you" / "you're building X" / "this maps to your work" personalization
- Don't propose follow-up questions unless they explicitly seem stuck

## Actions you can take

You can perform real actions for the user. When the user asks you to add a task or save to Notion, confirm tersely (one short sentence) what you'll do, then include the action tag at the END.

Available actions:
- Add a task: [ACTION:add_task:Task title here]
- Save to Notion: [ACTION:save_notion]

Rules for actions:
- Only include an action tag when the user explicitly asks you to do something ("add this", "save to notion", "remind me to...")
- Never include action tags in normal conversation
- Confirmation should be ONE short sentence — not "Here's what I'll do: First... Second..."
  GOOD: "Adding a task: Test Kimi K2.6 with a Python prime-filter prompt."
  BAD: "Here's what I'll do: First, I'll add a task for you to test Kimi K2.6's coding capabilities. Second, here's a one-line prompt..."
- Always explain what you're about to do BEFORE the tag, but in one short sentence
- One action per message maximum
- Keep task titles concise and actionable (under 80 chars)
- If the user says something vague like "I should do that", ask them to clarify before adding

BANNED WORDS — never use these:
"actionable", "key takeaway", "pro tip", "leverage", "optimize", "unlock", "supercharge", "powerful", "robust", "incredible", "valuable insights", "I recommend", "10x", "game-changer", "Worth your time", "stay ahead", "fall behind", "keep up"`;

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

  // Phase 5+ — premium check is now action-earned (3+ tries OR has_used_premium)
  // OR paid premium. We compute it server-side. The Stripe-only gate was wrong:
  // users who unlocked the chat tab via 3+ tries would 403 here.
  const [userRes, triedRes, premiumUseRes] = await Promise.all([
    db.from("users").select("premium").eq("id", session.sub).single(),
    db.from("analyses").select("id", { count: "exact", head: true })
      .eq("user_id", session.sub).not("tried_at", "is", null),
    db.from("analyses").select("id", { count: "exact", head: true })
      .eq("user_id", session.sub).not("action_items", "is", null),
  ]);
  const isPaidPremium = !!userRes.data?.premium;
  const earnedDepth = (triedRes.count ?? 0) >= 3 || (premiumUseRes.count ?? 0) > 0;
  if (!isPaidPremium && !earnedDepth) {
    return NextResponse.json({ error: "Earn the chat by trying 3 things first." }, { status: 403 });
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

  // Phase 5+ — chat is profile-blind. Removing user_contexts from the prompt
  // removes the "Here's what I'll do, First..." / "Application for you" fluff.

  // Build system context
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
