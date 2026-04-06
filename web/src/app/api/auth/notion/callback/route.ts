import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const baseUrl = request.nextUrl.origin;

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/?notion_error=denied", baseUrl),
    );
  }

  // Get logged-in user
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(
      new URL("/?notion_error=not_logged_in", baseUrl),
    );
  }

  // Exchange code for access token
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/?notion_error=config", baseUrl),
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${baseUrl}/api/auth/notion/callback`,
    }),
  });

  const tokenData = (await tokenRes.json()) as Record<string, unknown>;

  if (!tokenRes.ok) {
    console.error("Notion OAuth error:", tokenData);
    return NextResponse.redirect(
      new URL("/?notion_error=token_exchange", baseUrl),
    );
  }

  const accessToken = tokenData.access_token as string;
  const workspaceName = (tokenData.workspace_name as string) || "Connected";

  // Find or create ContextDrop database in user's workspace
  const notionHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  // Search for existing ContextDrop database
  const searchRes = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: notionHeaders,
    body: JSON.stringify({ query: "ContextDrop" }),
  });
  const searchData = (await searchRes.json()) as {
    results: Array<{ object: string; id: string }>;
  };
  const existingDb = searchData.results?.find((r) => r.object === "database");

  let databaseId: string;

  if (existingDb) {
    databaseId = existingDb.id;
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
      return NextResponse.redirect(
        new URL("/?notion_error=no_pages", baseUrl),
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

    const dbData = (await createRes.json()) as { id: string; message?: string };
    if (!createRes.ok) {
      console.error("Notion DB create error:", dbData);
      return NextResponse.redirect(
        new URL("/?notion_error=db_create", baseUrl),
      );
    }

    databaseId = dbData.id;
  }

  // Save to user record
  const supabase = getSupabase();
  await supabase
    .from("users")
    .update({
      notion_access_token: accessToken,
      notion_database_id: databaseId,
      notion_workspace_name: workspaceName,
    })
    .eq("id", session.sub);

  // Redirect to dashboard with success
  const username = session.username || session.tid;
  return NextResponse.redirect(
    new URL(`/${username}?notion=connected`, baseUrl),
  );
}
