import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";
import { HUMANIZER_RULES } from "@/lib/humanizer-rules";

const ASK_PROMPT = `You're answering a follow-up question about a specific piece of content the reader saved. You already showed them the short verdict and (if they tapped Deep Dive) the deeper breakdown.

You don't know who the reader is. Don't assume their profession or what they're building. Don't filter your answer through a CV — answer about the content, not about them. The old version of this prompt told you to "tailor to their project" — that's gone. Same anti-bias rule as the verdict pipeline.

Pull from the actual transcript / caption / visual. If they ask how to do something, give the first concrete step — not a strategy overview. If the answer isn't in the content, say so plainly: "wasn't covered in the content" and give your honest take if you have one — but distinguish between "this was in the content" and "my read on it."

Rules:
- Be specific — reference what was actually said or shown
- Under 200 words. Tighter is better.
- No "Great question!" — just answer it
- If they ask something implementable, give the exact command, URL, or first step from the source
- Never invent links, prices, or features that weren't in the source material
- Don't reference "your project" or "your work" — you don't know what those are
- No "Application for you" sections, no personalization-by-role

${HUMANIZER_RULES}`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Phase 5+ — earned-depth gate: 3+ tried-it OR previously used premium feature
  // OR paid premium. Same as the chat route. The old paid-only gate broke for
  // users who earned access through action.
  const db = getSupabase();
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
    return NextResponse.json({ error: "Earn this by trying 3 things first." }, { status: 403 });
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

  // Phase 5+ — Ask is profile-blind. Removing user_contexts from the prompt
  // removes the "Application for you (Kaan): blueprint for VoiceForge..." fluff.
  const parts: string[] = [];

  parts.push("--- CONTENT ---");
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
