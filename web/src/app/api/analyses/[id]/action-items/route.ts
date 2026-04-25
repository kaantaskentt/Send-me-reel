import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";
import { HUMANIZER_RULES } from "@/lib/humanizer-rules";

const ACTION_ITEMS_PROMPT = `The reader tapped "Look closer." They already saw the short verdict. They want the substance — what the topic ACTUALLY IS, where to try it, and what to do with it.

CRITICAL — TALK ABOUT THE SUBJECT, NOT THE POST:

The single biggest failure mode is meta-describing the post instead of the topic. Never write:
- BAD: "The content introduces X..."
- BAD: "The post doesn't go into technical details."
- BAD: "Beyond this introduction, the post..."
- BAD: "The announcement was made via..."

These describe the POST. The reader knows it's a LinkedIn post. They want the TOPIC.

GOOD voice:
- "Kimi K2.6 is Moonshot AI's coding model. SWE-Bench Pro 58.6, BrowseComp 83.2. Open-source, frontier-tier on code benchmarks. Try it at kimi.com or via API."
- "This Vibeyard tool is an open-source Claude Code companion — adds a live browser so you can click elements to edit them instead of describing them in prompts. Install from github.com/elirantutia/vibeyard."

USE BACKGROUND KNOWLEDGE — this is NOT the verdict:

The verdict is anti-fabrication, source-only. The Deep Dive is opt-in expansion. You CAN and SHOULD draw on world knowledge about well-known tools, models, companies, and concepts to give the reader actual context the post itself didn't include.

If Moonshot AI announced Kimi K2.6 in a one-sentence LinkedIn post, the reader still wants to know what Kimi is, where Moonshot is from, what their model line looks like, and how to actually try it. Tell them. The post being thin is not a reason for your output to be thin.

WHAT YOU CAN ADD FROM BACKGROUND:
- General context about named companies, tools, models, concepts (e.g., "Moonshot AI is the Beijing AI lab behind Kimi")
- Common access paths (e.g., "Kimi web app at kimi.com" — only if you're confident, never guess)
- Specific prompts or commands the reader could try with widely-known tools (Claude Code, Ollama, Cursor, etc.)
- Comparisons to other well-known tools in the same space when useful

WHAT YOU CANNOT INVENT:
- Specific prices or pricing tiers if you're not sure
- Exact version numbers for less-known tools
- URLs you're not confident about (when unsure, write "their website" or omit the link)
- Quotes attributed to specific people that you're not sure they said
- Specifics that the post lacks AND that you can't confidently provide from training

If unsure about a specific URL or price, OMIT it — don't make it up.

SECTIONS:

1. KEY INSIGHTS (2-4 items)
What this thing IS and why it matters. Use background knowledge to expand beyond what the post said. Specifics, numbers, comparisons, the tool's actual capability vs. its hype.

If the post is about a well-known thing, give the reader the briefing they actually want — what it is, where it sits in the landscape, what's notable. Don't write "the post doesn't say."

If the post is about something genuinely obscure that you don't have background on, THEN the section can be thin — but only then.

2. TOOLS & RESOURCES (1-5 items)
Concrete things the reader could touch. Include:
- Name (exact)
- One-line factual description
- Link if confident — official websites for well-known tools, github URLs from the post or that you know exist. If unsure, omit link.
- Price/access if known (free, free tier, paid, open source, requires API key)

3. TRY THIS (1-3 items) — THE MOST IMPORTANT SECTION
The reader's hands-on path. Include:
- A specific URL to visit, OR
- A command to run, OR
- A prompt to copy/paste into a tool they likely use (Claude Code, ChatGPT, Cursor, Ollama)

Examples of GOOD try_this items:
- title: "Try Kimi via the web app", description: "Open kimi.com (or platform.moonshot.cn for the API). Sign in. Paste this prompt to test multi-step reasoning: 'Plan a 3-step refactor for a TypeScript file with an unused export. Show the plan before executing.' Compare the output to Claude or GPT-4 on the same prompt."
- title: "Test similar reasoning in Claude Code", description: "Open Claude Code, paste: 'Treat this as a long-horizon task: read CLAUDE.md, then propose 3 incremental refactors that improve the codebase, ranked by ROI. Don't execute yet.' Lets you compare Claude's plan-then-execute mode with what Kimi K2.6 markets."
- title: "Install Vibeyard locally", description: "git clone github.com/elirantutia/vibeyard && cd vibeyard && npm install && npm run dev. Open localhost:5173, click any element on a test page."

Each item should fit on 2-3 lines. Be specific and copy-pasteable.

If the topic genuinely has no concrete try-path you can confidently recommend, return a smaller try_this array — but try hard before returning empty. The reader tapped Look closer because they want hands-on stuff.

NO "FOR YOU" SECTION:
The old version had a for_you section that referenced the reader's profession ("you're building VoiceForge"). That's RETIRED. for_you must always be []. Schema preserved for back-compat only.

NO PROFILE BIAS:
- Don't reference "your project" / "your work" / "your stack"
- Don't filter through profession
- Talk about the topic, not the reader

VOICE:
- Direct, confident, concrete. Like a teammate texting you the briefing.
- No filler ("It's worth noting that..." / "Importantly...").
- No meta-description of the post.
- Numbers, names, copy-pasteable specifics.

BANNED WORDS — never use these:
"actionable", "key takeaway", "pro tip", "deep dive", "leverage", "optimize", "unlock", "supercharge", "powerful", "robust", "incredible", "valuable insights", "great content", "highly relevant", "I recommend", "10x", "game-changer", "Worth your time", "Skim it", "Skip", "stay ahead", "fall behind", "keep up", "level up", "ecosystem", "streamline"

Return as JSON:
{
  "insights": [{"text": "..."}],
  "resources": [{"name": "...", "description": "...", "link": "...", "price": "..."}],
  "for_you": [],
  "try_this": [{"title": "...", "description": "..."}]
}

${HUMANIZER_RULES}

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
