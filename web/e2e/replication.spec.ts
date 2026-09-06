import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const screenshots = "/private/tmp/contextdrop-replication-qa";
test.beforeAll(async () => { await mkdir(screenshots, { recursive: true }); });

test("development demo has honest states, source navigation, downloads and a responsive layout", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/replicate/demo");
  await expect(page).toHaveTitle("Workbench demo | ContextDrop");
  await expect(page.getByRole("heading", { name: "You saved it. Now make it happen." })).toBeVisible();
  await expect(page.getByText("Interactive demo", { exact: true })).toBeVisible();
  await expect(page.getByText("Not executed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Example plan below" })).toBeDisabled();
  await page.screenshot({ path: `${screenshots}/workbench-desktop.png`, fullPage: true });
  await page.getByRole("button", { name: "frame-3", exact: true }).click();
  await expect(page.getByRole("tab", { name: /Source evidence/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("The presenter clicks the theme button and the background switches from white to dark navy.")).toBeVisible();
  await expect(page.getByRole("link", { name: "0:34" })).toBeVisible();
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "JSON", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("contextdrop-demo-website-tutorial.json");
  await page.getByRole("tab", { name: /Execution plan/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${screenshots}/workbench-mobile.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("workbench prepares from the API, pairs locally and confirms browser actions without claiming success", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const id = "11111111-1111-4111-8111-111111111111";
  const goal = "Recreate the demonstrated theme switch for my own page.";
  const analysis = { id, platform: "youtube", status: "done", source_url: "https://example.com/fixture", transcript: "Click the theme button.", frame_descriptions: [{ timestampSec: 12, description: "A theme button is visible." }], metadata: { title: "Browser QA fixture: theme switch" }, caption: "Illustrative test content", verdict: null };
  const plan = { version: 1, analysisId: id, sourceUrl: analysis.source_url, title: "Prepare a working theme switch", goal, mode: "build", summary: "A source-based test plan, with mocked provider responses.", prerequisites: ["A browser"], steps: [{ id: "step-1", instruction: "Click the demonstrated theme button.", evidenceIds: ["frame-1"], kind: "observed", verification: "The theme changes." }], evidence: [{ id: "frame-1", kind: "frame", text: "A theme button is visible.", timestampSec: 12 }], warnings: ["Test fixture. No real AI calls or browser actions are made."], successCriteria: ["The theme visibly changes."] };
  await page.route(`**/api/analyses/${id}`, (route) => route.fulfill({ json: analysis }));
  await page.route(`**/api/analyses/${id}/replicate`, async (route) => { expect(route.request().postDataJSON()).toEqual({ goal, mode: "build" }); await route.fulfill({ json: { plan, status: "prepared", usage: { remaining: 19 } } }); });
  const fixture = await page.context().newPage();
  await fixture.setContent('<html><body style="font:24px system-ui;padding:80px;background:#f0f5ff;color:#123"><p>Illustrative browser state</p><h1>A website worth building</h1><button style="padding:18px;border:4px solid #f59e0b;border-radius:12px;background:#2563eb;color:white;font-size:20px">1 · Change theme</button><p style="font-size:14px">Test fixture. Proposed target highlighted.</p></body></html>');
  const screenshot = `data:image/png;base64,${(await fixture.screenshot()).toString("base64")}`;
  await fixture.close();
  let state: Record<string, unknown> = { id: "browser-fixture", status: "awaiting_approval", workspace: "/private/tmp/fixture-workspace", currentUrl: "https://example.com", screenshot, message: "Review the proposed click.", pendingAction: { id: "action-1", type: "click", targetId: "1", description: "Click the highlighted theme button." }, history: [] };
  let approved = false; let stopped = false;
  await page.route("http://127.0.0.1:43187/**", async (route) => {
    const request = route.request();
    const headers = { "Access-Control-Allow-Origin": new URL(page.url()).origin, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    expect(request.headers().authorization).toBe("Bearer test-pairing-token-kept-in-memory");
    const path = new URL(request.url()).pathname;
    if (path === "/health") return route.fulfill({ headers, json: { status: "ready", platform: "darwin", capabilities: { terminal: false, browser: { configured: true } } } });
    if (path === "/runs" && request.method() === "POST") { expect(request.postDataJSON()).toEqual({ plan, executor: "browser" }); return route.fulfill({ headers, json: { id: "browser-fixture", status: "launching", workspace: state.workspace } }); }
    if (path.endsWith("/approve")) { expect(request.postDataJSON()).toEqual({ actionId: "action-1", approved: true }); approved = true; state = { ...state, status: "finished_unverified", pendingAction: undefined, history: [{ action: "Click theme button", status: "performed" }], message: "Inspect the browser result." }; }
    if (path.endsWith("/stop")) { stopped = true; state = { ...state, status: "stopped" }; }
    return route.fulfill({ headers, json: state });
  });
  await page.goto(`/replicate?analysis=${id}`);
  await page.getByLabel("Your outcome, in your words").fill(goal);
  await page.getByRole("button", { name: "Prepare my plan" }).click();
  await expect(page.getByRole("heading", { name: plan.title })).toBeVisible();
  await expect(page.getByText("19 planning requests remain in the current window.")).toBeVisible();
  await page.getByRole("button", { name: /Browser walkthrough/ }).click();
  await expect(page.getByText(/Browser guidance sends screenshots and visible page text/)).toBeVisible();
  await page.getByRole("button", { name: "Connect this Mac" }).click();
  await page.getByLabel("Paste the pairing token printed in Terminal").fill("test-pairing-token-kept-in-memory");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mac connected" })).toBeVisible();
  await page.getByRole("button", { name: /Build in Terminal/ }).click();
  await expect(page.getByText(/Terminal launch requires Codex CLI installed/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Open in Terminal", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: /Browser walkthrough/ }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start browser walkthrough" }).click();
  const session = page.getByRole("dialog", { name: "Browser walkthrough", exact: true });
  await expect(session).toBeVisible();
  await expect(page.getByText("Your decision is needed", { exact: true })).toBeVisible();
  await expect(session.getByRole("button", { name: "Approve this action" })).toBeInViewport();
  await page.getByRole("button", { name: "Expand current browser screenshot" }).click();
  await expect(page.getByRole("dialog", { name: "Expanded browser screenshot", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Expanded local browser screenshot" })).toBeVisible();
  await page.getByRole("button", { name: "Close screenshot" }).click();
  await expect(page.getByRole("dialog", { name: "Expanded browser screenshot", exact: true })).not.toBeVisible();
  await page.screenshot({ path: `${screenshots}/browser-confirmation.png`, fullPage: false });
  await page.getByRole("button", { name: "Back to plan", exact: true }).click();
  await expect(session).not.toBeVisible();
  await page.getByRole("button", { name: "View browser session" }).click();
  await expect(session).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(session.getByRole("button", { name: "Approve this action" })).toBeInViewport();
  await page.screenshot({ path: `${screenshots}/browser-confirmation-mobile.png`, fullPage: false });
  expect(await session.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Approve this action" }).click();
  await expect(page.getByText("Session ended · outcome unverified", { exact: true })).toBeVisible();
  expect(approved).toBe(true);
  await page.getByRole("button", { name: "Close browser session" }).click();
  await expect(page.getByText("Session stopped", { exact: true })).toBeVisible();
  expect(stopped).toBe(true);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => Object.values(sessionStorage).concat(Object.values(localStorage)).some((value) => String(value).includes("test-pairing-token")))).toBe(false);
});
