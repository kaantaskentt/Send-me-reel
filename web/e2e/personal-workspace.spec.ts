import { test, expect, type Page } from "@playwright/test";
import type { PersonalRun, RunOutput } from "../src/lib/local-runs";

let analysisId: string;
test.beforeAll(async ({ request }) => {
  // Existing source is read only. Every conversation, provider, and computer action below is a fixture.
  const response = await request.get("/api/local/capture");
  expect(response.status()).toBe(200);
  const capture = await response.json();
  expect(capture.status).toBe("done");
  analysisId = capture.id;
});

const runId = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const originalSource = "https://github.com/example/source-for-earlier-task";
const title = "Fixture original repository task";
const phoneSourceId = "cccccccc-3333-4333-8333-cccccccccccc";

async function fixtures(page: Page, initialStatus = "running") {
  const run: PersonalRun = {
    id: runId, executor: "terminal", analysisId: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb", sourceUrl: originalSource,
    title, goal: "Make a small local example from the original repository.", status: initialStatus,
    workspace: "/private/tmp/contextdrop-ui-fixture/project", createdAt: "2026-09-13T10:00:00Z", updatedAt: "2026-09-13T10:02:46Z",
    harness: "codex", terminalMode: "exec", canStop: initialStatus === "running", canResume: false,
  };
  const output: RunOutput = {
    id: runId, mode: "streaming", log: { text: "$ node check-example.mjs\nFixture check: rendered heading found.\n", truncated: false, updatedAt: "2026-09-13T10:00:05Z" },
    result: { text: "# Fixture result\nCreated example.html. The agent reports a heading check; review the actual result.\n<script>window.shouldNeverExecute=true</script>", path: "CONTEXTDROP-RESULT.md", source: "report", verification: "unverified", truncated: false },
  };
  const state = {
    run, output, listReads: 0, outputReads: 0, libraryReads: 0, stops: 0, reveals: 0, phonePairs: 0, phoneSyncs: 0, inboxDismisses: 0, captureAttempts: 0,
    forbidden: [] as string[], errors: [] as string[], token: "",
    share: { available: true, shortcutAvailable: true, items: [] as { id: string; url: string; receivedAt: string; source: "iphone" }[], lastSyncedAt: "2026-09-13T10:02:00Z" },
    allowRejectedCapture: false,
    phone: { paired: false, configured: true, workerOnline: true, importedTotal: 0, newCount: 0, pendingCount: 0, failedCount: 0, hasMore: false, lastSyncedAt: null as string | null, lastError: null },
  };
  page.on("pageerror", error => state.errors.push(error.message));
  await page.route("**/*", async route => {
    const request = route.request(); const url = new URL(request.url());
    if (/(^|\.)(openai\.com|anthropic\.com|generativelanguage\.googleapis\.com)$/.test(url.hostname)) {
      state.forbidden.push("provider request"); return route.abort();
    }
    if (url.port === "43187") {
      const headers = { "Access-Control-Allow-Origin": "http://127.0.0.1:3127", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      const authorization = request.headers().authorization;
      expect(/^Bearer .{32,}$/.test(authorization ?? "")).toBe(true);
      state.token = authorization.slice(7);
      if (url.pathname === "/health" && request.method() === "GET") return route.fulfill({ headers, json: { status: "ready", platform: "darwin", version: 1, execution: "streaming-terminal", capabilities: { terminal: true, harnesses: { codex: true, claude: true }, browser: { configured: true } } } });
      if (url.pathname === "/runs" && request.method() === "GET") { state.listReads++; return route.fulfill({ headers, json: { runs: [state.run] } }); }
      if (url.pathname === `/runs/${runId}` && request.method() === "GET") return route.fulfill({ headers, json: state.run });
      if (url.pathname === `/runs/${runId}/output` && request.method() === "GET") { state.outputReads++; return route.fulfill({ headers, json: output }); }
      if (url.pathname === `/runs/${runId}/stop` && request.method() === "POST") {
        expect(request.postDataJSON()).toEqual({}); state.stops++; state.run.status = "stopping";
        return route.fulfill({ headers, status: 202, json: state.run });
      }
      if (url.pathname === `/runs/${runId}/reveal` && request.method() === "POST") {
        expect(request.postDataJSON()).toEqual({ target: "workspace" }); state.reveals++;
        return route.fulfill({ headers, json: { opened: true } });
      }
      state.forbidden.push(`${request.method()} ${url.pathname}`);
      return route.fulfill({ headers, status: 409, json: { error: "Unreviewed fixture operation" } });
    }
    if (url.pathname === "/api/local/chat") {
      if (request.method() !== "GET") { state.forbidden.push("unexpected chat generation"); return route.fulfill({ status: 409, json: { error: "No live analysis in this fixture" } }); }
      return route.fulfill({ json: { version: 1, analysisId, guide: {version:4,analysisId,title:"Saved source actions",summary:"A useful tool is shown in this source.",evidence:[],choices:["Find the tool","Explain the idea","Make a demo"].map((label,index)=>({id:`choice-${index+1}`,label,detail:"A useful next step.",kind:"ask",request:"Explain this idea in simple words.",mode:"research",executor:"browser"}))}, messages: [{ id: "fixture-answer", role: "assistant", text: "Fixture conversation for the current source.", createdAt: "2026-09-13T10:01:00Z", reply: { answer: "Fixture conversation for the current source.", suggestions: [], actions: [], evidence: [], allowedUrls: [] } }] } });
    }
    if (url.pathname === "/api/local/inbox") {
      if (request.method() === "GET") return route.fulfill({ json: state.share });
      const body = request.postDataJSON();
      if (body.action === "dismiss" && state.share.items.some(item => item.id === body.id)) {
        state.inboxDismisses++; state.share.items = state.share.items.filter(item => item.id !== body.id);
        return route.fulfill({ json: state.share });
      }
      if (body.action === "sync") return route.fulfill({ json: state.share });
      state.forbidden.push("unexpected shared inbox operation"); return route.fulfill({ status: 409, json: { error: "No live inbox operation in this fixture" } });
    }
    if (url.pathname === "/api/local/capture" && request.method() === "POST" && state.allowRejectedCapture) {
      state.captureAttempts++;
      expect(request.postDataJSON()).toEqual({ url: state.share.items[0]?.url, provider: "auto" });
      return route.fulfill({ status: 503, json: { error: "Fixture reader unavailable; keep the pending link." } });
    }
    if (url.pathname === "/api/local/phone") {
      if (request.method() === "GET") return route.fulfill({ json: state.phone });
      const body = request.postDataJSON();
      if (body.dashboardLink === "https://contextdrop.ai/auth/telegram?token=ui-fixture-only") { state.phonePairs++; state.phone.paired = true; return route.fulfill({ json: state.phone }); }
      if (body.action === "sync") { state.phoneSyncs++; state.phone.importedTotal = 1; state.phone.newCount = 1; state.phone.lastSyncedAt = "2026-09-13T10:02:00Z"; return route.fulfill({ json: state.phone }); }
      state.forbidden.push("unexpected phone operation"); return route.fulfill({ status: 409, json: { error: "No live pairing or phone operation in this fixture" } });
    }
    if (url.pathname === "/api/local/library" && request.method() === "GET") {
      state.libraryReads++;
      const items = [{ analysisId, title: "Current source fixture", platform: "youtube", createdAt: "2026-09-13T10:00:00Z" }];
      if (state.phone.importedTotal) items.push({ analysisId: phoneSourceId, title: "New phone save fixture", platform: "instagram", createdAt: "2026-09-13T10:02:00Z" });
      return route.fulfill({ json: { currentAnalysisId: analysisId, items } });
    }
    if (url.pathname.startsWith("/api/local/") && request.method() !== "GET") {
      state.forbidden.push(`${request.method()} ${url.pathname}`);
      return route.fulfill({ status: 409, json: { error: "No live data changes in this fixture" } });
    }
    return route.continue();
  });
  return state;
}

test("Tasks recovers previous work after reload and keeps original source, actual output and unverified report together", async ({ page }) => {
  const state = await fixtures(page, "finished_unverified");
  await page.goto("/replicate/local");
  await expect(page.getByRole("heading", {name:"Saved source actions",exact:true})).toBeVisible();
  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  const tasks = page.getByRole("dialog", { name: "Your tasks", exact: true });
  await expect(tasks.getByRole("button", { name: new RegExp(title) })).toBeVisible();
  await tasks.getByRole("button", { name: new RegExp(title) }).click();
  const workroom = page.getByRole("dialog", { name: "Your task", exact: true });
  await expect(workroom.getByRole("heading", { name: title })).toBeVisible();
  await expect(workroom.getByText("Auto · Codex", { exact: true })).toBeVisible();
  await expect(workroom.getByRole("region", { name: "Task result" })).toContainText("Created example.html");
  await expect(workroom.locator("details[open]")).toHaveCount(0);
  await expect(workroom.getByText("2m 46s", { exact: true })).toBeVisible();
  await expect(workroom.getByText("$ node check-example.mjs", { exact: false })).not.toBeVisible();
  await workroom.getByText("Activity & details", { exact: true }).click();
  await expect(workroom.getByRole("link", { name: "Original source" })).toHaveAttribute("href", originalSource);
  await expect(workroom.getByRole("region", { name: "Terminal task output" })).toContainText("$ node check-example.mjs");
  await expect(workroom.getByRole("status")).toHaveText("Finished · review the result");
  await expect(workroom.getByText("Open the files to check the result.", { exact: true })).toBeVisible();
  await expect(workroom.getByRole("region", { name: "Terminal task output" })).toContainText("Created example.html");
  await workroom.getByText("Report & checks", { exact: true }).click();
  expect(await page.evaluate(() => "shouldNeverExecute" in window)).toBe(false);
  await workroom.getByRole("button", { name: "Open files", exact: true }).click();
  expect(state.reveals).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  await tasks.getByRole("button", { name: new RegExp(title) }).click();
  await workroom.getByText("Activity & details", { exact: true }).click();
  await expect(workroom.getByRole("link", { name: "Original source" })).toHaveAttribute("href", originalSource);
  await expect(workroom.getByRole("region", { name: "Terminal task output" })).toContainText("Fixture check: rendered heading found.");
  expect(state.listReads).toBeGreaterThanOrEqual(2);
  expect(state.outputReads).toBeGreaterThanOrEqual(2);
  expect(state.stops).toBe(0);
  expect(state.errors).toEqual([]); expect(state.forbidden).toEqual([]);
  expect(await page.evaluate(token => Object.values(sessionStorage).concat(Object.values(localStorage)).some(value => String(value).includes(token)), state.token)).toBe(false);
});

test("Tasks stops only the selected run, acknowledges stopping, and keeps source context on a narrow screen", async ({ page }) => {
  const state = await fixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/replicate/local");
  await expect(page.getByRole("heading", {name:"Saved source actions",exact:true})).toBeVisible();
  await page.getByRole("button", { name: /^Tasks/ }).click();
  await page.getByRole("dialog", { name: "Your tasks", exact: true }).getByRole("button", { name: new RegExp(title) }).click();
  const workroom = page.getByRole("dialog", { name: "Your task", exact: true });
  await expect(workroom.getByRole("status")).toHaveText("Wrapping up");
  await workroom.getByRole("button", { name: "Stop task", exact: true }).click();
  await expect(workroom.getByRole("status")).toHaveText("Stopping");
  await expect(workroom.getByRole("button", { name: "Stop task", exact: true })).toBeDisabled();
  expect(state.stops).toBe(1);
  state.run.status = "stopped"; state.run.canStop = false;
  await expect(workroom.getByRole("status")).toHaveText("Stopped");
  await workroom.getByText("Activity & details", { exact: true }).click();
  await expect(workroom.getByRole("link", { name: "Original source" })).toHaveAttribute("href", originalSource);
  expect(await workroom.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("body *")].filter(element => {const r=element.getBoundingClientRect();return r.width>0 && r.right>innerWidth+1;}).slice(0,12).map(element=>({tag:element.tagName,class:element.className,width:element.getBoundingClientRect().width,right:element.getBoundingClientRect().right}))))).toBe(true);
  expect(state.errors).toEqual([]); expect(state.forbidden).toEqual([]);
});

test("Tasks shows live progress and reveals a report without making the user switch tabs", async ({ page }) => {
  const state = await fixtures(page);
  state.output.result.text = "";
  state.output.progress = { phase: "building", update: "Building the example page.", updatedAt: "2026-09-13T10:00:05Z" };
  await page.goto("/replicate/local");
  await page.getByRole("button", { name: /^Tasks/ }).click();
  await page.getByRole("dialog", { name: "Your tasks", exact: true }).getByRole("button", { name: new RegExp(title) }).click();
  const workroom = page.getByRole("dialog", { name: "Your task", exact: true });
  await expect(workroom.getByRole("status")).toHaveText("Building");
  await expect(workroom.getByText("Building the example page.", { exact: true })).toBeVisible();
  await expect(workroom.locator("details[open]")).toHaveCount(0);
  state.output.result.text = "Created example.html. Open the file to review it.";
  await expect(workroom.getByRole("status")).toHaveText("Wrapping up");
  await expect(workroom.getByRole("region", { name: "Task result" })).toContainText("Created example.html");
  state.run.status = "finished_unverified"; state.run.canStop = false;
  await expect(workroom.getByRole("status")).toHaveText("Finished · review the result");
  await expect(workroom.getByRole("button", { name: "Stop task" })).toHaveCount(0);
  expect(state.errors).toEqual([]); expect(state.forbidden).toEqual([]);
});

test("Phone inbox pairs explicitly and refreshes the library after import without switching the current conversation", async ({ page }) => {
  const state = await fixtures(page, "finished_unverified");
  await page.goto("/replicate/local");
  await expect(page.getByRole("heading", {name:"Saved source actions",exact:true})).toBeVisible();
  const currentSource = page.getByRole("heading",{name:"Saved source actions",exact:true});
  const originalHeading = await currentSource.textContent();
  const composer = page.getByLabel("Ask about your content");
  await composer.fill("Keep this unsent question with my current source.");
  await page.getByRole("button", { name: "Phone inbox", exact: true }).click();
  const inbox = page.getByRole("dialog", { name: "Send from your iPhone", exact: true });
  await inbox.getByText("Setup help and Telegram", { exact: true }).click();
  await expect(inbox.getByRole("link", { name: "Open the ContextDrop bot" })).toHaveAttribute("href", "https://t.me/contextdrop2027bot");
  await expect(inbox.getByLabel("Your personal dashboard link")).toHaveAttribute("type", "password");
  await inbox.getByLabel("Your personal dashboard link").fill("https://contextdrop.ai/auth/telegram?token=ui-fixture-only");
  await inbox.getByRole("button", { name: "Connect my Telegram", exact: true }).click();
  await expect(inbox.getByText("Paired", { exact: true })).toBeVisible();
  await expect(inbox.getByText("Running", { exact: true })).toBeVisible();
  expect(state.phonePairs).toBe(1); expect(state.phoneSyncs).toBe(0);
  await inbox.getByRole("button", { name: "Sync now", exact: true }).click();
  await expect.poll(() => state.phoneSyncs).toBe(1);
  await page.keyboard.press("Escape");
  await expect(inbox).toHaveCount(0);
  await page.getByRole("button", {name:"Saved content",exact:true}).click();
  const recent = page.getByRole("dialog", {name:"Saved content",exact:true});
  await expect(recent.getByRole("button", { name: /New phone save fixture/ })).toBeVisible();
  await expect(recent.getByRole("button", { name: /Current source fixture/ })).toHaveAttribute("aria-current", "true");
  await page.keyboard.press("Escape");
  await expect(currentSource).toHaveText(originalHeading!);
  await expect(composer).toHaveValue("Keep this unsent question with my current source.");
  expect(state.phoneSyncs).toBe(1);
  expect(state.errors).toEqual([]); expect(state.forbidden).toEqual([]);
  expect(await page.evaluate(() => Object.values(sessionStorage).concat(Object.values(localStorage)).some(value => String(value).includes("ui-fixture-only")))).toBe(false);
});

test("An iPhone share prefills the exact link, keeps the current chat and pending item until capture is accepted", async ({ page }) => {
  const state = await fixtures(page, "finished_unverified");
  const url = "https://www.instagram.com/reel/fixture_ai_tool/?igsh=fixture";
  state.share.items = [{ id: "iphone-fixture-1", url, receivedAt: "2026-09-13T10:02:00Z", source: "iphone" }];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/replicate/local");
  await expect(page.getByRole("heading", {name:"Saved source actions",exact:true})).toBeVisible();
  const source = page.getByRole("heading", {name:"Saved source actions",exact:true});
  const sourceHeading = await source.textContent();
  const composer = page.getByLabel("Ask about your content");
  await composer.fill("Keep this draft with my original source.");
  await page.getByLabel("Content link",{exact:true}).fill("https://www.youtube.com/watch?v=fixture");
  await page.getByText("Reading options", { exact: true }).click();
  await page.getByLabel("Content reader", { exact: true }).selectOption("gemini");
  await page.getByLabel("Look for something specific").fill("An earlier YouTube-only question.");
  const phoneButton = page.getByRole("button", { name: /^Phone inbox/ });
  await expect(phoneButton).toContainText("1");
  await phoneButton.click();
  const inbox = page.getByRole("dialog", { name: "Send from your iPhone", exact: true });
  await expect(inbox.getByRole("link", { name: "Get iPhone shortcut" })).toHaveAttribute("href", "/api/local/inbox/shortcut");
  await expect(inbox.getByRole("button", { name: `Dismiss ${url}`, exact: true })).toBeVisible();
  expect(await inbox.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await inbox.getByRole("button", { name: `instagram.com ${url}`, exact: true }).click();
  await expect(inbox).toHaveCount(0);
  await expect(page.getByLabel("Content link", { exact: true })).toHaveValue(url);
  await expect(page.getByLabel("Content link", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Content reader", { exact: true })).toHaveValue("auto");
  await expect(page.getByLabel("Look for something specific")).toHaveValue("");
  await expect(composer).toHaveValue("Keep this draft with my original source.");
  await expect(source).toHaveText(sourceHeading!);
  expect(state.captureAttempts).toBe(0); expect(state.inboxDismisses).toBe(0);
  expect(state.share.items).toHaveLength(1); expect(state.forbidden).toEqual([]);
  state.allowRejectedCapture = true;
  await page.getByRole("button", { name: "Read this link", exact: true }).click();
  await expect(page.getByRole("region", { name: "Add content", exact: true }).getByRole("alert")).toContainText("Fixture reader unavailable");
  expect(state.captureAttempts).toBe(1); expect(state.inboxDismisses).toBe(0);
  expect(state.share.items).toHaveLength(1);
  await phoneButton.click();
  await expect(inbox.getByRole("button", { name: `Dismiss ${url}`, exact: true })).toBeVisible();
  await inbox.getByRole("button", { name: `Dismiss ${url}`, exact: true }).click();
  await expect(inbox.getByText("Links from your phone will appear here.", { exact: true })).toBeVisible();
  expect(state.inboxDismisses).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("body *")].filter(element => {const r=element.getBoundingClientRect();return r.width>0 && r.right>innerWidth+1;}).slice(0,12).map(element=>({tag:element.tagName,class:element.className,width:element.getBoundingClientRect().width,right:element.getBoundingClientRect().right}))))).toBe(true);
  expect(state.errors).toEqual([]); expect(state.forbidden).toEqual([]);
});
