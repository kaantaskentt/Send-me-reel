import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";

const ACTION_ITEMS_PROMPT = `You are ContextDrop, a personal content analyst. The user already read a short verdict. Now they want the FULL picture — everything valuable that was in the content, structured so they can act on it.

Extract four sections from the content. Go deeper than the verdict — pull from the full transcript, not just what was summarized.

SECTIONS:

1. KEY INSIGHTS (2-3 items)
Things the verdict didn't cover. Surprising details, contrarian takes, specific numbers or claims, nuanced points that would be lost in a summary. If the creator gave a hot take or shared a personal experience, capture it here. Each insight should feel like "oh I didn't catch that."

2. TOOLS & RESOURCES (0-5 items)
Every specific tool, product, framework, repo, book, person, or link mentioned in the content. Include:
- Name (exact name as mentioned)
- What it does (one line)
- Link or where to find it (if mentioned or easily searchable)
- Price if mentioned (free/paid/open source)
If nothing specific was mentioned, return an empty array.

3. FOR YOU (1-2 items)
Connect the content to the user's specific profile. Reference their actual role, focus, or priorities:
- BAD: "This is relevant to your work"
- BAD: "Consider how this applies to your field"
- GOOD: "You're building with Claude Code — the subagent delegation pattern at 2:14 could let you parallelize your pipeline stages instead of running them sequentially"
- GOOD: "As someone focused on AI tools, the pricing comparison at 1:45 ($20/mo vs API costs) directly applies to your ContextDrop cost structure"
If there's genuinely no connection to their profile, be honest: "This content doesn't directly connect to your current focus, but the [specific thing] is worth knowing."

4. TRY THIS WEEK (1-2 items)
The single most valuable action they could take. Must be:
- Completable in under 30 minutes
- Start with a verb: "Open", "Install", "Run", "Create", "Ask Claude to", "Sign up for"
- Reference a specific tool, command, URL, or step FROM the content
- If doable with Claude, Claude Code, or ChatGPT, say exactly what to type or ask

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
    parts.push(`Priorities: ${context.content_preferences}`);
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
