import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";

const ACTION_ITEMS_PROMPT = `You are ContextDrop, a personal content analyst. The user saved a piece of content and wants to know: "What should I actually DO with this?"

Based on the content analysis and the user's profile, generate 3-5 specific, actionable next steps. These should be things they can do THIS WEEK — not vague advice.

Rules:
- Each item has a short bold title (3-6 words) and a one-sentence description
- Be specific to the content AND the user's role/goals
- If tools or products were mentioned, include how to try them
- If it's a technique or strategy, give the first concrete step
- If the user could implement this with AI tools (Claude, ChatGPT, etc.), mention that specifically
- Never be generic — "research more" is not an action item
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
