import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import type { ContentConversation, ContentReply } from "../src/lib/content-conversation";

const screenshots = "/private/tmp/contextdrop-content-qa";
const suggestions = ["Find the tools mentioned.", "Explain the useful skill.", "Help me adapt this idea."];
const knownUrl = "https://github.com/openai/codex";
const taskGoal = "Inspect the referenced project and propose a small version for my Mac. Review setup before making changes.";
let analysisId: string;

test.beforeAll(async ({ request }) => {
  await mkdir(screenshots, { recursive: true });
  // Read-only prerequisite. The page supplies the real captured source; every
  // chat/provider/companion interaction in these tests is an explicit fixture.
  const response = await request.get("/api/local/capture");
  expect(response.status()).toBe(200);
  const capture = await response.json();
  expect(capture.status, "Keep a completed local capture active while these UI tests run").toBe("done");
  expect(typeof capture.id).toBe("string");
  analysisId = capture.id;
});

function quickReply(): ContentReply {
  return { answer: "This source introduces AI tools and a useful workflow. You can investigate the tools, understand the idea, or adapt it for your own project.", suggestions, actions: [], evidence: [], allowedUrls: [] };
}

async function fixture(page: Page, initial?: ContentReply) {
  const conversation: ContentConversation = { version: 1, analysisId, messages: [] };
  let nextId = 0;
  const appendAssistant = (reply: ContentReply) => conversation.messages.push({ id: `fixture-assistant-${++nextId}`, role: "assistant", text: reply.answer, reply, createdAt: "2026-09-06T18:00:00Z" });
  if (initial) appendAssistant(initial);
  const state = { briefs: 0, failNext: false, messages: [] as string[], mutations: [] as string[], unsafeRequests: [] as string[], pageErrors: [] as string[], consoleErrors: [] as string[], imageRequests: [] as string[] };
  page.on("pageerror", error => state.pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") state.consoleErrors.push(message.text()); });
  page.on("request", request => {
    const url = new URL(request.url());
    if (["unverified.example", "tracker.example"].includes(url.hostname)) state.unsafeRequests.push(request.url());
    if (url.pathname.startsWith("/api/local/frames/")) state.imageRequests.push(request.url());
  });
  await page.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (["unverified.example", "tracker.example"].includes(url.hostname)) return route.abort();
    if (url.port === "43187" || /(^|\.)(openai\.com|anthropic\.com|generativelanguage\.googleapis\.com)$/.test(url.hostname)) {
      state.mutations.push(`blocked external operation: ${url.origin}${url.pathname}`);
      return route.fulfill({ status: 409, json: { error: "UI fixture never runs a provider or companion." } });
    }
    if (!url.pathname.startsWith("/api/local/")) return route.continue();
    if (url.pathname === "/api/local/chat") {
      if (request.method() === "GET") return route.fulfill({ json: conversation });
      expect(request.method()).toBe("POST");
      const body = request.postDataJSON(); expect(body.analysisId).toBe(analysisId);
      if (body.brief) { state.briefs++; if (!conversation.messages.length) appendAssistant(quickReply()); return route.fulfill({ json: conversation }); }
      state.messages.push(body.message);
      if (state.failNext) { state.failNext = false; return route.fulfill({ status: 502, json: { error: "Fixture server could not finish. Your saved conversation is intact; no computer action was started." } }); }
      conversation.messages.push({ id: `fixture-user-${++nextId}`, role: "user", text: body.message, createdAt: "2026-09-06T18:01:00Z" });
      appendAssistant({ answer: "I found the public project. You can open its page or review a local inspection task. Nothing has been launched.", suggestions: [], evidence: [], allowedUrls: [knownUrl], actions: [
        { id: "fixture-open", kind: "open_url", label: "Open verified project", detail: "Public identity checked in this test fixture.", url: knownUrl, goal: null, mode: "research" },
        { id: "fixture-task", kind: "prepare_task", label: "Prepare my local inspection", detail: "Review the proposed task before opening a coding app.", url: knownUrl, goal: taskGoal, mode: "build" },
      ] });
      return route.fulfill({ json: conversation });
    }
    if (request.method() !== "GET") {
      state.mutations.push(`${request.method()} ${url.pathname}`);
      return route.fulfill({ status: 409, json: { error: "Fixture blocked a real local mutation." } });
    }
    if (url.pathname === "/api/local/library") return route.fulfill({ json: { currentAnalysisId: analysisId, items: [{ analysisId, title: "Current source UI fixture", platform: "youtube", createdAt: "2026-09-06T18:00:00Z", completedAt: "2026-09-06T18:01:00Z" }] } });
    if (url.pathname === "/api/local/capture") return route.fulfill({ json: { id: analysisId, status: "done" } });
    return route.continue(); // source-bound JPEG reads are safe; no real mutation.
  });
  return state;
}

async function browserEvidence(state: Awaited<ReturnType<typeof fixture>>, testInfo: TestInfo) {
  const body = JSON.stringify({ pageErrors: state.pageErrors, consoleErrors: state.consoleErrors, unsafeRequests: state.unsafeRequests }, null, 2);
  await testInfo.attach("browser-errors.json", { contentType: "application/json", body });
  await writeFile(`${screenshots}/browser-errors-${testInfo.title.split(" ")[0]}.json`, body);
  expect(state.pageErrors).toEqual([]);
  expect(state.consoleErrors.filter(message => !message.includes("502 (Bad Gateway)"))).toEqual([]);
  expect(state.unsafeRequests).toEqual([]);
  expect(state.mutations).toEqual([]);
}

test("content starts with three suggestions, keeps chat after reload, and prepares the chosen Claude task only on request", async ({ page }, testInfo) => {
  const state = await fixture(page);
  await page.goto("/replicate/local");
  const chat = page.getByRole("region", { name: "Chat with your content" });
  await expect(chat.getByText(quickReply().answer)).toBeVisible();
  for (const suggestion of suggestions) await expect(chat.getByRole("button", { name: suggestion, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "From plan to your computer" })).toHaveCount(0);
  expect(state.briefs).toBe(1);
  await page.screenshot({ path: `${screenshots}/content-quick-take-desktop.png`, fullPage: true });
  const question = "Find the referenced project and help me inspect it.";
  await page.getByLabel("Ask about your content").fill(question);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(chat.getByText(question, { exact: true })).toBeVisible();
  await expect(chat.getByRole("link", { name: /Open verified project/ })).toHaveAttribute("href", knownUrl);
  await expect(page.getByRole("heading", { name: "From plan to your computer" })).toHaveCount(0);
  await page.reload();
  await expect(chat.getByText(question, { exact: true })).toBeVisible();
  expect(state.briefs).toBe(1); expect(state.messages).toEqual([question]);
  await chat.getByRole("button", { name: /Prepare my local inspection/ }).click();
  await expect(page.getByLabel("Your outcome, in your words")).toHaveValue(taskGoal);
  await expect(page.getByLabel("Coding app")).toHaveValue("claude");
  await expect(page.getByRole("button", { name: "Open in Terminal", exact: true })).toBeDisabled();
  await expect(page.getByText(/Opens Claude Code in plan mode/)).toBeVisible();
  await page.screenshot({ path: `${screenshots}/content-chosen-task.png`, fullPage: true });
  await browserEvidence(state, testInfo);
});

test("server failure retains the user's draft and never mounts execution", async ({ page }, testInfo) => {
  const state = await fixture(page, quickReply());
  await page.goto("/replicate/local");
  await expect(page.getByText(quickReply().answer, { exact: true })).toBeVisible();
  const draft = "Please find the GitHub name briefly visible near the end.";
  state.failNext = true;
  await page.getByLabel("Ask about your content").fill(draft);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("region", { name: "Chat with your content" }).getByRole("alert")).toContainText("no computer action was started");
  await expect(page.getByLabel("Ask about your content")).toHaveValue(draft);
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "From plan to your computer" })).toHaveCount(0);
  await expect(page.getByText(quickReply().answer, { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/content-server-failure.png`, fullPage: true });
  await browserEvidence(state, testInfo);
});

test("unverified Markdown links and images stay inert and content fits desktop, tablet and phone widths", async ({ page }, testInfo) => {
  const answer = `A legitimate [project link](${knownUrl}) can be opened. These are unverified: <https://unverified.example/auto>, https://unverified.example/bare, [reference][ref], and [inline](https://unverified.example/inline).\n\n![tracking pixel][image]\n\n[ref]: https://unverified.example/reference\n[image]: https://tracker.example/pixel?content=source-clue`;
  const state = await fixture(page, { answer, suggestions, actions: [], evidence: [], allowedUrls: [knownUrl] });
  await page.goto("/replicate/local");
  const chat = page.getByRole("region", { name: "Chat with your content" });
  await expect(chat.getByRole("link", { name: "project link", exact: true })).toHaveAttribute("href", knownUrl);
  await expect(chat.locator('a[href*="unverified.example"]')).toHaveCount(0);
  await expect(chat.locator("img")).toHaveCount(0);
  for (const width of [1440, 565, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByLabel("Ask about your content")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Horizontal overflow at ${width}px`).toBe(true);
    expect(await chat.evaluate(element => element.scrollWidth <= element.clientWidth), `Chat overflow at ${width}px`).toBe(true);
    await page.screenshot({ path: `${screenshots}/content-width-${width}.png`, fullPage: true });
  }
  for (const url of state.imageRequests) expect(new URL(url).searchParams.get("analysisId")).toBe(analysisId);
  await browserEvidence(state, testInfo);
});
