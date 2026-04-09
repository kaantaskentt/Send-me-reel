import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";

const ACTION_ITEMS_PROMPT = `You are ContextDrop, a personal content analyst. The user saved a piece of content and wants to know: "What did I actually just watch, and what should I do with it?"

STEP 1: Detect the content type:
- TOOL REVIEW: Content showcases specific tools, products, or services
- TUTORIAL: Content teaches how to do something step by step
- ADVICE/OPINION: Content shares strategies, mindset, or career advice
- NEWS: Content covers industry news, launches, or announcements
- LIST/ROUNDUP: Content covers multiple items (e.g., "5 AI tools", "3 skills to learn")
- OTHER: Doesn't fit the above

STEP 2: Extract based on type:

For TOOL REVIEW:
- Name of each tool/product mentioned
- What it does (one line)
- Pricing if mentioned (free, paid, freemium)
- How to try it (link or search term)

For TUTORIAL:
- The specific steps taught, in order
- Tools or prerequisites needed
- What you'll have when done

For ADVICE/OPINION:
- The core insight (one sentence)
- The specific advice given
- What to do differently starting today

For LIST/ROUNDUP:
- Each item mentioned with a one-line description
- Which one is most relevant to the user's profile and why

For NEWS:
- What happened and why it matters
- Who it affects
- What to watch for next

STEP 3: Generate 3-5 personalized action items based on the extraction AND the user's profile. Each action item should be something they can do THIS WEEK.

Rules:
- Each item has a short bold title (3-6 words) and a 1-2 sentence description
- ALWAYS reference specific names, tools, links, or steps from the content — never be vague
- If the user could do this with Claude, ChatGPT, or Claude Code, say so specifically
- BANNED phrases: "research more", "look into", "keep an eye on", "explore", "consider", "monitor", "stay updated". These are not actions.
- GOOD action items start with: "Open", "Install", "Create", "Build", "Sign up for", "Run", "Ask Claude to", "Try", "Set up", "Connect"
- Every action item must name a SPECIFIC tool, link, command, or step from the content
- Return as JSON array: [{"title": "...", "description": "..."}]
- Return ONLY the JSON array, no other text`;

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

  // Fetch the analysis (must belong to this user)
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
      parts.push(`Extended profile: ${context.extended_context}`);
    }
  }

  parts.push("\n--- CONTENT ANALYSIS ---");
  parts.push(`Platform: ${analysis.platform}`);
  if (analysis.verdict) parts.push(`Verdict: ${analysis.verdict}`);
  if (analysis.caption) parts.push(`Caption: ${analysis.caption}`);
  if (analysis.transcript) parts.push(`Transcript: ${analysis.transcript.slice(0, 2000)}`);
  if (analysis.visual_summary) parts.push(`Visual summary: ${analysis.visual_summary.slice(0, 1000)}`);

  parts.push("\nGenerate 3-5 personalized action items for this user based on this content.");

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      messages: [
        { role: "system", content: ACTION_ITEMS_PROMPT },
        { role: "user", content: parts.join("\n") },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({ error: "AI returned empty response" }, { status: 500 });
    }

    // Parse JSON from the response
    let actionItems;
    try {
      actionItems = JSON.parse(text);
    } catch {
      // If model wrapped it in markdown code block, extract
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        actionItems = JSON.parse(match[0]);
      } else {
        console.error("Failed to parse action items:", text);
        return NextResponse.json({ error: "Failed to parse action items" }, { status: 500 });
      }
    }

    // Cache the result on the analysis
    await db
      .from("analyses")
      .update({ action_items: actionItems })
      .eq("id", id);

    return NextResponse.json({ action_items: actionItems, cached: false });
  } catch (err) {
    console.error("Action items generation error:", err);
    return NextResponse.json({ error: "Failed to generate action items" }, { status: 500 });
  }
}
