import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";

const ACTION_ITEMS_PROMPT = `You went deeper. The user already saw the short verdict. They tapped "Deep Dive" because they want the substance — what was IN the content beyond the two-sentence summary. Pull from the full transcript and visuals.

You don't know who the reader is. Don't filter through their profession. Don't assume what they're building. Don't write "for you" lines that personalize through a CV. The deep dive deepens the CONTENT, not the reader's identity.

If the content was thin, say so — return small arrays or empty arrays. Two real insights beat four padded ones. If the creator is selling something, flag it plainly: "he's pitching a course, but the free stuff he shows is enough."

SECTIONS:

1. KEY INSIGHTS (1-3 items)
Things the verdict didn't cover. Surprising details, contrarian takes, specific numbers, nuanced points. Each should feel like "oh I missed that." If there's only 1 real insight, give 1 — don't pad.

2. TOOLS & RESOURCES (0-5 items)
Every specific tool, product, framework, repo, book, person, or link ACTUALLY MENTIONED in the content. Include:
- Name (exact as mentioned)
- What it does (one line, factual — no adjectives)
- Link ONLY if explicitly stated in transcript/caption — never guess URLs
- Price ONLY if mentioned (free / paid / open source)
Nothing real to list? Empty array. NEVER invent resources.

3. TRY THIS (0-3 items)
Concrete actions a reader could take in under 30 minutes. Texted-not-emailed voice.
- Start with a verb: "Open", "Install", "Run", "Create", "Sign up for"
- Reference a specific tool, command, repo, or step FROM the content — not generic advice
- BAD: "Learn how to install a local model"
- GOOD: "Run 'ollama pull llama3' in terminal — 2 minutes, then test with 'ollama run llama3'"
- BAD: "Apply this to your workflow"
- GOOD: "Clone github.com/eliranturia/vibeyard, install via npm, click any element on a test page"
- Content has no concrete action? Empty array. Empty array is better than vague homework.

NO "FOR YOU" SECTION:
The old version of this had a "for_you" section that referenced the reader's profession ("you're building VoiceForge", "this maps to your Claude Code work"). That section is RETIRED. The deep dive does NOT personalize through profile.
- Don't write "consider how this applies to your work"
- Don't write "this is relevant if you care about X"
- Don't reference specific projects or tools the reader uses
- The for_you array in the response must always be EMPTY — return [] for it. The schema is preserved for back-compat but the section is gone.

VOICE:
- Direct. Confident. Concrete. Like a teammate who watched the same thing.
- Not a consultant writing a report.
- No filler ("It's worth noting that..." / "Importantly...").
- Numbers, names, exact phrases — preserve specifics from the source.

BANNED WORDS — never use these:
"actionable", "key takeaway", "pro tip", "deep dive", "leverage", "optimize", "unlock", "supercharge", "powerful", "robust", "incredible", "valuable insights", "great content", "highly relevant", "I recommend", "10x", "game-changer", "Worth your time", "Skim it", "Skip", "stay ahead", "fall behind", "keep up", "level up", "ecosystem", "streamline"

ANTI-HALLUCINATION:
- Only cite tools, prices, links, and steps that appear in the transcript, caption, or visual summary
- If you only have caption text (no transcript), work from what you have — don't write as if you watched the full video
- Never guess URLs. If a tool was mentioned but no link was given, omit the link field

Return as JSON:
{
  "insights": [{"text": "..."}],
  "resources": [{"name": "...", "description": "...", "link": "...", "price": "..."}],
  "for_you": [],
  "try_this": [{"title": "...", "description": "..."}]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no backticks, no explanation.`;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getSupabase();

  const { data: analysis } = await db
    .from("analyses")
    .select("id, verdict, transcript, visual_summary, caption, metadata, platform, action_items, user_id")
    .eq("id", id)
    .eq("user_id", session.sub)
    .single();

  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If already generated, return cached
  if (analysis.action_items) {
    return NextResponse.json({ action_items: analysis.action_items, cached: true });
  }

  // Phase 5+ — Deep Dive is profile-blind. Same architectural fix as Pass 1
  // of the verdict pipeline: removing user_contexts from the prompt removes
  // the "Application for You (Kaan)" / "you're building VoiceForge" fluff.
  // The reader earned this surface through 3+ tries; that doesn't mean the
  // model should re-personalize through a CV.
  const parts: string[] = [];

  parts.push("--- CONTENT ANALYSIS ---");
  parts.push(`Platform: ${analysis.platform}`);
  if (analysis.verdict) parts.push(`Short verdict (already shown to user): ${analysis.verdict}`);
  if (analysis.caption) parts.push(`Caption: ${analysis.caption}`);
  if (analysis.transcript) parts.push(`Full transcript: ${analysis.transcript.slice(0, 3000)}`);
  if (analysis.visual_summary) parts.push(`Visual summary: ${analysis.visual_summary.slice(0, 1000)}`);

  const meta = analysis.metadata as Record<string, unknown> | null;
  if (meta?.authorUsername) parts.push(`Creator: @${meta.authorUsername}`);
  if (meta?.authorName) parts.push(`Creator name: ${meta.authorName}`);

  parts.push("\nGo deeper than the verdict. Pull from the full transcript and visuals — extract the three sections (insights, resources, try_this) PLUS the empty for_you array.");

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 1000,
      messages: [
        { role: "system", content: ACTION_ITEMS_PROMPT },
        { role: "user", content: parts.join("\n") },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({ error: "AI returned empty response" }, { status: 500 });
    }

    let actionItems;
    try {
      actionItems = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        actionItems = JSON.parse(match[0]);
      } else {
        console.error("Failed to parse action items:", text);
        return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
      }
    }

    // Cache the result
    await db
      .from("analyses")
      .update({ action_items: actionItems })
      .eq("id", id);

    return NextResponse.json({ action_items: actionItems, cached: false });
  } catch (err) {
    console.error("Action items generation error:", err);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
