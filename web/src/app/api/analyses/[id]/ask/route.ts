import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";
import { HUMANIZER_RULES } from "@/lib/humanizer-rules";
import { formatSubjectResearchForPrompt, type SubjectResearch } from "@/lib/subject-research";

const ASK_PROMPT = `You're answering a follow-up question about a specific piece of content the reader saved. You can look things up on the web when the question reaches past what's in the source.

You don't know who the reader is. Don't assume their profession or what they're building. Don't filter your answer through a CV — answer about the SUBJECT, not about them.

Pull from the actual transcript / caption / visual / subject research first. Use web_search ONLY when:
- The reader asks for the latest version, current price, or live status of something.
- They ask "where is X" / "how do I install X" and the source didn't include it.
- A specific URL or fact would make the answer materially better and isn't in the existing context.

Don't search for general opinions or things already in the existing context. Don't dump search results — distill.

Rules:
- Be specific — reference what was actually said, shown, or found.
- Under 200 words. Tighter is better.
- No "Great question!" openers.
- If implementable, give the exact command, URL, or first step.
- Never invent links, prices, or features.
- Don't reference "your project" or "your work" — you don't know those.

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

  const { data: analysis } = await db
    .from("analyses")
    .select("verdict, transcript, visual_summary, caption, platform, subject_research")
    .eq("id", id)
    .eq("user_id", session.sub)
    .single<{
      verdict: string | null;
      transcript: string | null;
      visual_summary: string | null;
      caption: string | null;
      platform: string;
      subject_research: SubjectResearch | null;
    }>();

  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parts: string[] = [];
  parts.push("--- CONTENT ---");
  parts.push(`Platform: ${analysis.platform}`);
  if (analysis.verdict) parts.push(`Verdict: ${analysis.verdict}`);
  if (analysis.transcript) parts.push(`Transcript: ${analysis.transcript.slice(0, 3000)}`);
  if (analysis.visual_summary) parts.push(`Visual: ${analysis.visual_summary.slice(0, 1000)}`);
  if (analysis.caption) parts.push(`Caption: ${analysis.caption}`);

  const research = formatSubjectResearchForPrompt(analysis.subject_research);
  if (research) parts.push(`\n${research}`);

  parts.push(`\n--- USER QUESTION ---\n${question}`);

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1",
      tools: [{ type: "web_search" }],
      max_output_tokens: 800,
      input: [
        { role: "system", content: ASK_PROMPT },
        { role: "user", content: parts.join("\n") },
      ],
    });

    const answer = response.output_text?.trim();
    if (!answer) {
      return NextResponse.json({ error: "No answer generated" }, { status: 500 });
    }

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Ask error:", err);
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
  }
}
