import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

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

  const notionHeaders = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  // Verify token works
  const meRes = await fetch("https://api.notion.com/v1/users/me", {
    headers: notionHeaders,
  });
  if (!meRes.ok) {
    return NextResponse.json(
      { error: "Invalid Notion token. Please check and try again." },
      { status: 400 },
    );
  }

  // Search for existing ContextDrop database
  const searchRes = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: notionHeaders,
    body: JSON.stringify({ query: "ContextDrop" }),
  });
  const searchData = (await searchRes.json()) as {
    results: Array<{ object: string; id: string }>;
  };
  const dbResult = searchData.results?.find((r) => r.object === "database");

  let databaseId: string;

  if (dbResult) {
    databaseId = dbResult.id;
  } else {
    // Find a page to use as parent
    const pagesRes = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: notionHeaders,
      body: JSON.stringify({
        filter: { value: "page", property: "object" },
        page_size: 1,
      }),
    });
    const pagesData = (await pagesRes.json()) as {
      results: Array<{ id: string }>;
    };

    if (!pagesData.results?.length) {
      return NextResponse.json(
        { error: "No pages found. Make sure you shared at least one page with your integration." },
        { status: 400 },
      );
    }

    // Create ContextDrop database
    const createRes = await fetch("https://api.notion.com/v1/databases", {
      method: "POST",
      headers: notionHeaders,
      body: JSON.stringify({
        parent: { type: "page_id", page_id: pagesData.results[0].id },
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

    const db = (await createRes.json()) as { id: string; message?: string };
    if (!createRes.ok) {
      return NextResponse.json(
        { error: `Failed to create Notion database: ${db.message}` },
        { status: 500 },
      );
    }

    databaseId = db.id;
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
