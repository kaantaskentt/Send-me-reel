/**
 * Shared Notion page creation utility.
 * Used by both the /api/notion/push route and the OAuth callback auto-push.
 */

interface AnalysisData {
  verdict: string;
  transcript: string | null;
  visual_summary: string | null;
  source_url: string;
  platform: string;
  verdict_intent: string | null;
}

interface PushResult {
  url: string;
}

export async function pushToNotion(
  accessToken: string,
  databaseId: string,
  analysis: AnalysisData,
): Promise<PushResult> {
  const titleMatch = analysis.verdict.match(/🔷\s*(.+)/);
  const title = titleMatch ? titleMatch[1].trim() : "Untitled Analysis";

  const intent = analysis.verdict_intent || "learn";
  const status = intent === "learn" ? "To Learn" : "To Apply";
  const platformName =
    analysis.platform.charAt(0).toUpperCase() + analysis.platform.slice(1);

  // Build page content blocks
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
        rich_text: [{ text: { content: "\ud83d\udcdd Full Transcript" } }],
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
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      icon: { emoji: intent === "learn" ? "\ud83d\udcda" : "\u26a1" },
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
    if (res.status === 401 || res.status === 403) {
      throw new Error("NOTION_RECONNECT");
    }
    throw new Error(
      `Notion error: ${(page as { message?: string }).message || "Unknown"}`,
    );
  }

  const pageUrl =
    (page.url as string) ||
    `https://notion.so/${(page.id as string).replace(/-/g, "")}`;

  return { url: pageUrl };
}
