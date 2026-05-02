import { expect, test } from "@playwright/test";
import { formatPersonalWikiContextBlock, type WikiPageForContext } from "../src/lib/wiki/retrieval";

function page(overrides: Partial<WikiPageForContext>): WikiPageForContext {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    user_id: overrides.user_id ?? "user-a",
    path: overrides.path ?? "topics/ai-agents/overview",
    title: overrides.title ?? "AI Agents",
    page_type: overrides.page_type ?? "concept",
    summary: overrides.summary ?? "Default summary",
    body_md: overrides.body_md ?? "Default body",
    confidence: overrides.confidence ?? 0.8,
    updated_at: overrides.updated_at ?? "2026-05-02T00:00:00.000Z",
  };
}

test("wiki retrieval context filters same wiki path by user_id", () => {
  const context = formatPersonalWikiContextBlock({
    userId: "user-a",
    latestUserMessage: "what did I save about AI agents?",
    pages: [
      page({
        id: "page-a",
        user_id: "user-a",
        path: "topics/ai-agents/overview",
        summary: "User A is comparing agent frameworks for ContextDrop.",
        body_md: "User A cares about agentic chat and task execution.",
      }),
      page({
        id: "page-b",
        user_id: "user-b",
        path: "topics/ai-agents/overview",
        summary: "User B is studying unrelated enterprise procurement.",
        body_md: "This must never leak into user A context.",
      }),
    ],
  });

  expect(context).toContain("User A is comparing agent frameworks");
  expect(context).toContain("agentic chat and task execution");
  expect(context).not.toContain("User B");
  expect(context).not.toContain("enterprise procurement");
});
