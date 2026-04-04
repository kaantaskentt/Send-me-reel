import { Client } from "@notionhq/client";
import { ServiceError } from "../pipeline/types.js";

/**
 * Verify a user-supplied Notion token works and find/create the ContextDrop database.
 * Returns the database ID.
 */
export async function setupWorkspace(accessToken: string): Promise<{
  databaseId: string;
  workspaceName: string;
}> {
  const notion = new Client({ auth: accessToken });

  // Verify token works by listing users
  try {
    await notion.users.me({});
  } catch {
    throw new ServiceError("NOTION_AUTH", "Invalid Notion token. Please check and try again.");
  }

  // Search for existing ContextDrop database
  const allResults = await notion.search({ query: "ContextDrop" });
  const dbResult = allResults.results.find((r) => (r as any).object === "database");

  if (dbResult) {
    return {
      databaseId: dbResult.id,
      workspaceName: "your workspace",
    };
  }

  // Find a page to use as parent
  const pages = await notion.search({
    filter: { value: "page", property: "object" } as any,
    page_size: 1,
  });

  if (pages.results.length === 0) {
    throw new ServiceError(
      "NOTION_NO_PAGES",
      "No pages found. Make sure you shared at least one page with your integration.",
    );
  }

  const parentId = pages.results[0].id;

  // Create ContextDrop database via REST API (SDK version doesn't support properties on create)
  const createRes = await fetch("https://api.notion.com/v1/databases", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { type: "page_id", page_id: parentId },
      title: [{ text: { content: "ContextDrop" } }],
      icon: { emoji: "⚡" },
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
    throw new ServiceError("NOTION_DB_CREATE", `Failed to create database: ${(db as any).message}`);
  }

  return {
    databaseId: db.id as string,
    workspaceName: "your workspace",
  };
}

/**
 * Push an analysis to the user's ContextDrop Notion database.
 * Returns the URL of the created page.
 */
export async function pushAnalysis(
  accessToken: string,
  databaseId: string,
  analysis: {
    verdict: string;
    transcript: string | null;
    visualSummary: string | null;
    sourceUrl: string;
    platform: string;
    intent: string;
  },
): Promise<string> {
  const notion = new Client({ auth: accessToken });

  // Extract title from verdict
  const titleMatch = analysis.verdict.match(/🔷\s*(.+)/);
  const title = titleMatch ? titleMatch[1].trim() : "Untitled Analysis";

  const status = analysis.intent === "learn" ? "To Learn" : "To Apply";
  const platformName =
    analysis.platform.charAt(0).toUpperCase() + analysis.platform.slice(1);

  const children: any[] = [];

  // Callout with the verdict
  children.push({
    object: "block",
    type: "callout",
    callout: {
      rich_text: [{ text: { content: analysis.verdict.slice(0, 2000) } }],
      icon: { emoji: "⚡" },
      color: "blue_background",
    },
  });

  children.push({ object: "block", type: "divider", divider: {} });

  // Transcript toggle
  if (analysis.transcript) {
    children.push({
      object: "block",
      type: "toggle",
      toggle: {
        rich_text: [{ text: { content: "📝 Full Transcript" } }],
        children: splitIntoBlocks(analysis.transcript),
      },
    });
  }

  // Visual analysis toggle
  if (analysis.visualSummary) {
    children.push({
      object: "block",
      type: "toggle",
      toggle: {
        rich_text: [{ text: { content: "👁 Visual Analysis" } }],
        children: splitIntoBlocks(analysis.visualSummary),
      },
    });
  }

  children.push({ object: "block", type: "divider", divider: {} });

  // Source link
  children.push({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        { text: { content: "Source: " } },
        { text: { content: analysis.sourceUrl, link: { url: analysis.sourceUrl } } },
      ],
    },
  });

  // Use REST API directly (SDK version has type issues with properties)
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      icon: { emoji: analysis.intent === "learn" ? "📚" : "⚡" },
      properties: {
        Name: { title: [{ text: { content: title } }] },
        Status: { select: { name: status } },
        Platform: { select: { name: platformName } },
        "Date Saved": { date: { start: new Date().toISOString().split("T")[0] } },
        "Source URL": { url: analysis.sourceUrl },
      },
      children,
    }),
  });

  const page = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new ServiceError("NOTION_PAGE_CREATE", `Failed to create page: ${(page as any).message}`);
  }

  return (page.url as string) || `https://notion.so/${(page.id as string).replace(/-/g, "")}`;
}

function splitIntoBlocks(text: string) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 1900) {
    chunks.push(text.slice(i, i + 1900));
  }
  return chunks.map((chunk) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ text: { content: chunk } }],
    },
  }));
}
