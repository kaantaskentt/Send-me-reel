import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { analysisId } = await request.json();
  if (!analysisId) {
    return NextResponse.json(
      { error: "analysisId is required" },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // Get user's Notion credentials
  const { data: user } = await supabase
    .from("users")
    .select("notion_access_token, notion_database_id")
    .eq("id", session.sub)
    .single();

  if (!user?.notion_access_token || !user?.notion_database_id) {
    return NextResponse.json(
      { error: "Notion not connected. Set up Notion first." },
      { status: 400 },
    );
  }

  // Get the analysis
  const { data: analysis } = await supabase
    .from("analyses")
    .select("verdict, transcript, visual_summary, source_url, platform, verdict_intent")
    .eq("id", analysisId)
    .eq("user_id", session.sub)
    .single();

  if (!analysis || !analysis.verdict) {
    return NextResponse.json(
      { error: "Analysis not found" },
      { status: 404 },
    );
  }

  // Extract title from verdict
  const titleMatch = analysis.verdict.match(/🔷\s*(.+)/);
  const title = titleMatch ? titleMatch[1].trim() : "Untitled Analysis";

  const intent = analysis.verdict_intent || "learn";
  const status = intent === "learn" ? "To Learn" : "To Apply";
  const platformName =
    analysis.platform.charAt(0).toUpperCase() + analysis.platform.slice(1);

  // Build page content
  const children: Record<string, unknown>[] = [];

  children.push({
    object: "block",
    type: "callout",
    callout: {
      rich_text: [{ text: { content: analysis.verdict.slice(0, 2000) } }],
      icon: { emoji: "\u26a1" },
      color: "blue_background",
    },
  });

  children.push({ object: "block", type: "divider", divider: {} });

  if (analysis.transcript) {
    const chunks: string[] = [];
    for (let i = 0; i < analysis.transcript.length; i += 1900) {
      chunks.push(analysis.transcript.slice(i, i + 1900));
    }
    children.push({
      object: "block",
      type: "toggle",
      toggle: {
        rich_text: [{ text: { content: "📝 Full Transcript" } }],
        children: chunks.map((chunk) => ({
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ text: { content: chunk } }] },
        })),
      },
    });
  }

  children.push({ object: "block", type: "divider", divider: {} });

  children.push({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        { text: { content: "Source: " } },
        {
          text: {
            content: analysis.source_url,
            link: { url: analysis.source_url },
          },
        },
      ],
    },
  });

  // Create Notion page
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.notion_access_token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: user.notion_database_id },
      icon: { emoji: intent === "learn" ? "📚" : "\u26a1" },
      properties: {
        Name: { title: [{ text: { content: title } }] },
        Status: { select: { name: status } },
        Platform: { select: { name: platformName } },
        "Date Saved": {
          date: { start: new Date().toISOString().split("T")[0] },
        },
        "Source URL": { url: analysis.source_url },
      },
      children,
    }),
  });

  const page = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    return NextResponse.json(
      { error: `Notion error: ${(page as { message?: string }).message}` },
      { status: 500 },
    );
  }

  const pageUrl =
    (page.url as string) ||
    `https://notion.so/${(page.id as string).replace(/-/g, "")}`;

  return NextResponse.json({ success: true, url: pageUrl });
}
