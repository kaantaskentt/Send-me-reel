import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";

const ACTION_ITEMS_PROMPT = `You're the user's sharp friend who already gave them the short version. They tapped "Deep Dive" — they want the real stuff. Go deeper than the verdict. Pull from the full transcript, not just what was summarized.

Your voice: direct, confident, like a teammate who's got their back. Not a consultant writing a report. Not an AI being helpful. A person who watched the same thing and is telling them what actually matters.

If the content was mid, say what little was worth pulling and move on. Don't inflate 2 takeaways into 4 to look thorough. If the creator is selling something, flag it — "he's pitching a course, but the free stuff he shows is enough."

SECTIONS:

1. KEY INSIGHTS (2-3 items)
Things the verdict didn't cover. Surprising details, contrarian takes, specific numbers, nuanced points lost in a summary. Hot takes, personal experiences — capture them. Each should feel like "oh I missed that." If there's only 1 real insight, just give 1.

2. TOOLS & RESOURCES (0-5 items)
Every specific tool, product, framework, repo, book, person, or link mentioned. Include:
- Name (exact)
- What it does (one line)
- Link if mentioned
- Price if mentioned (free/paid/open source)
Nothing mentioned? Empty array. Don't invent resources.

3. FOR YOU (1-2 items)
Connect to what the user is actually building. Reference their real work:
- BAD: "This is relevant to your work"
- BAD: "Consider how this applies to your field"
- GOOD: "You're building a scrape→transcribe→LLM pipeline — the error handling pattern at 2:14 would fix your retry logic"
- GOOD: "Skip the framework talk. The pricing breakdown at 1:45 is the part that matters for your cost structure"
No real connection? Say it: "Nothing here connects to what you're building right now."

4. TRY THIS WEEK (1-2 items)
Write it like you're texting them what to do. Not assigning homework.
- Completable in under 30 minutes
- Start with a verb: "Open", "Install", "Run", "Create", "Sign up for"
- Reference a specific tool, command, or step FROM the content
- If the honest answer is "nothing here worth acting on" — return an empty array

Return as JSON:
{
  "insights": [{"text": "..."}],
  "resources": [{"name": "...", "description": "...", "link": "...", "price": "..."}],
  "for_you": [{"text": "..."}],
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

  // Get user context for personalization
  const { data: context } = await db
    .from("user_contexts")
    .select("role, goal, content_preferences, extended_context")
    .eq("user_id", session.sub)
    .single();

  // Build the prompt
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

  parts.push("\n--- CONTENT ANALYSIS ---");
  parts.push(`Platform: ${analysis.platform}`);
  if (analysis.verdict) parts.push(`Verdict (already shown to user): ${analysis.verdict}`);
  if (analysis.caption) parts.push(`Caption: ${analysis.caption}`);
  if (analysis.transcript) parts.push(`Full transcript: ${analysis.transcript.slice(0, 3000)}`);
  if (analysis.visual_summary) parts.push(`Visual summary: ${analysis.visual_summary.slice(0, 1000)}`);

  const meta = analysis.metadata as Record<string, unknown> | null;
  if (meta?.authorUsername) parts.push(`Creator: @${meta.authorUsername}`);
  if (meta?.authorName) parts.push(`Creator name: ${meta.authorName}`);

  parts.push("\nGo deeper than the verdict. Extract the four sections for this user.");

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
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
