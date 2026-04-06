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
              { name: "Saved", color: "blue" },
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
 * Returns the URL of the created page, or existing page URL if already saved.
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
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  // Dedup: check if this URL is already in the database
  const queryRes = await fetch(
    `https://api.notion.com/v1/databases/${databaseId}/query`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        filter: {
          property: "Source URL",
          url: { equals: analysis.sourceUrl },
        },
        page_size: 1,
      }),
    },
  );
  const queryData = (await queryRes.json()) as {
    results: Array<{ id: string; url: string }>;
  };
  if (queryData.results?.length > 0) {
    const existing = queryData.results[0];
    return existing.url || `https://notion.so/${existing.id.replace(/-/g, "")}`;
  }

  // Parse verdict into structured parts
  const parsed = parseVerdict(analysis.verdict);
  const platformName =
    analysis.platform.charAt(0).toUpperCase() + analysis.platform.slice(1);

  // Build structured page content
  const children: Record<string, unknown>[] = [];

  // What it is
  if (parsed.whatItIs) {
    children.push({
      object: "block",
      type: "callout",
      callout: {
        rich_text: [{ text: { content: parsed.whatItIs } }],
        icon: { emoji: "🧠" },
        color: "blue_background",
      },
    });
  }

  // What's inside
  if (parsed.whatsInside) {
    children.push({
      object: "block",
      type: "callout",
      callout: {
        rich_text: [{ text: { content: parsed.whatsInside } }],
        icon: { emoji: "🔧" },
        color: "gray_background",
      },
    });
  }

  // Real-world context
  if (parsed.realWorld) {
    children.push({
      object: "block",
      type: "callout",
      callout: {
        rich_text: [{ text: { content: parsed.realWorld } }],
        icon: { emoji: "💡" },
        color: "yellow_background",
      },
    });
  }

  // Link
  if (parsed.link) {
    children.push({
      object: "block",
      type: "bookmark",
      bookmark: { url: parsed.link },
    });
  }

  // Tags
  if (parsed.tags) {
    children.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          { text: { content: parsed.tags }, annotations: { color: "gray" } },
        ],
      },
    });
  }

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
        {
          text: {
            content: analysis.sourceUrl,
            link: { url: analysis.sourceUrl },
          },
        },
      ],
    },
  });

  // Create page
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { database_id: databaseId },
      icon: { emoji: "⚡" },
      properties: {
        Name: {
          title: [{ text: { content: parsed.title } }],
        },
        Status: { select: { name: "Saved" } },
        Platform: { select: { name: platformName } },
        "Date Saved": {
          date: { start: new Date().toISOString().split("T")[0] },
        },
        "Source URL": { url: analysis.sourceUrl },
      },
      children,
    }),
  });

  const page = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new ServiceError(
      "NOTION_PAGE_CREATE",
      `Failed to create page: ${(page as { message?: string }).message}`,
    );
  }

  return (
    (page.url as string) ||
    `https://notion.so/${(page.id as string).replace(/-/g, "")}`
  );
}

/**
 * Parse verdict text into structured parts for Notion blocks.
 */
function parseVerdict(verdict: string): {
  title: string;
  whatItIs: string;
  whatsInside: string;
  realWorld: string;
  link: string;
  tags: string;
} {
  const lines = verdict.split("\n").map((l) => l.trim()).filter(Boolean);

  let title = "Untitled Analysis";
  let whatItIs = "";
  let whatsInside = "";
  let realWorld = "";
  let link = "";
  let tags = "";

  for (const line of lines) {
    if (line.startsWith("🔷")) {
      title = line.replace(/^🔷\s*/, "").trim();
    } else if (line.startsWith("🧠")) {
      whatItIs = line.replace(/^🧠\s*/, "").trim();
    } else if (line.startsWith("🔧")) {
      whatsInside = line.replace(/^🔧\s*/, "").trim();
    } else if (line.startsWith("💡")) {
      realWorld = line.replace(/^💡\s*/, "").trim();
    } else if (line.startsWith("🔗")) {
      link = line.replace(/^🔗\s*/, "").trim();
    } else if (line.match(/^[🆓💰🔓💻☁️🐍📦]/)) {
      tags = line.trim();
    }
  }

  // Fallback: if parsing found nothing, use the whole verdict
  if (!whatItIs && !whatsInside) {
    whatItIs = verdict.slice(0, 2000);
  }

  return { title, whatItIs, whatsInside, realWorld, link, tags };
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
