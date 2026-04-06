import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { Client } from "@notionhq/client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data } = await supabase
    .from("users")
    .select("notion_access_token, notion_database_id, notion_workspace_name")
    .eq("id", session.sub)
    .single();

  return NextResponse.json({
    connected: !!(data?.notion_access_token && data?.notion_database_id),
    workspaceName: data?.notion_workspace_name || null,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await request.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Verify token works
  const notion = new Client({ auth: token });
  try {
    await notion.users.me({});
  } catch {
    return NextResponse.json(
      { error: "Invalid Notion token. Please check and try again." },
      { status: 400 },
    );
  }

  // Search for existing ContextDrop database
  const allResults = await notion.search({ query: "ContextDrop" });
  const dbResult = allResults.results.find(
    (r) => (r as Record<string, unknown>).object === "database",
  );

  let databaseId: string;

  if (dbResult) {
    databaseId = dbResult.id;
  } else {
    // Find a page to use as parent
    const pages = await notion.search({
      filter: { value: "page", property: "object" } as Parameters<typeof notion.search>[0]["filter"],
      page_size: 1,
    });

    if (pages.results.length === 0) {
      return NextResponse.json(
        {
          error:
            "No pages found. Make sure you shared at least one page with your integration.",
        },
        { status: 400 },
      );
    }

    const parentId = pages.results[0].id;

    // Create ContextDrop database
    const createRes = await fetch("https://api.notion.com/v1/databases", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { type: "page_id", page_id: parentId },
        title: [{ text: { content: "ContextDrop" } }],
        icon: { emoji: "\u26a1" },
        properties: {
          Name: { title: {} },
          Status: {
            select: {
              options: [
                { name: "To Learn", color: "blue" },
                { name: "To Apply", color: "green" },
              ],
            },
          },
          Platform: {
            select: {
              options: [
                { name: "Instagram", color: "pink" },
                { name: "TikTok" },
                { name: "X", color: "gray" },
                { name: "Article", color: "yellow" },
              ],
            },
          },
          "Date Saved": { date: {} },
          "Source URL": { url: {} },
        },
      }),
    });

    const db = (await createRes.json()) as Record<string, unknown>;
    if (!createRes.ok) {
      return NextResponse.json(
        { error: `Failed to create Notion database: ${(db as { message?: string }).message}` },
        { status: 500 },
      );
    }

    databaseId = db.id as string;
  }

  // Save to user record
  const supabase = getSupabase();
  await supabase
    .from("users")
    .update({
      notion_access_token: token,
      notion_database_id: databaseId,
      notion_workspace_name: "Connected",
    })
    .eq("id", session.sub);

  return NextResponse.json({ success: true, databaseId });
}
