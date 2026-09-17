import { test, expect, type Page } from "@playwright/test";

const target = "https://www.instagram.com/reel/landing_handoff_fixture/?igsh=exact-link";

async function fixture(page: Page, options: { reject?: boolean } = {}) {
  const state = { captures: [] as unknown[], analyses: 0, chatReads: 0, userReads: 0, uploads: 0, reject: options.reject ?? false, captureUrl: target, errors: [] as string[] };
  page.on("pageerror", error => state.errors.push(error.message));
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname === "/api/user") { state.userReads++; return route.fulfill({ status: 401, json: { error: "Unauthorized" } }); }
    if (url.pathname === "/api/analyze") { state.analyses++; return route.fulfill({ status: 401, json: { error: "Sign in required" } }); }
    if (url.pathname === "/api/local/capture") {
      if (request.method() === "POST") {
        const body = request.postDataJSON(); state.captures.push(body); state.captureUrl = body.url;
        return state.reject ? route.fulfill({ status: 503, json: { error: "Fixture reader is unavailable. Try again." } }) : route.fulfill({ status: 202, json: { status: "starting", sourceUrl: state.captureUrl } });
      }
      return route.fulfill({ json: { status: "analyzing", sourceUrl: state.captureUrl, stage: "Reading the video" } });
    }
    if (url.pathname === "/api/local/upload") { state.uploads++; state.captureUrl = "contextdrop://upload/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"; return route.fulfill({ status: 202, json: { status: "starting", sourceUrl: state.captureUrl } }); }
    if (url.pathname === "/api/local/health") return route.fulfill({ json: { status: "ready", readers: { gemini: true, frames: true, pages: true }, chat: { configured: true }, companion: { connected: false, terminal: false, browser: false, execution: null }, issues: [] } });
    if (url.pathname === "/api/local/chat") { state.chatReads++; return route.fulfill({ status: 409, json: { error: "No previous-source chat allowed in this test" } }); }
    if (url.pathname.startsWith("/api/local/")) return route.fulfill({ json: url.pathname.endsWith("/inbox") ? { available: true, items: [] } : url.pathname.endsWith("/library") ? { items: [] } : {} });
    if (url.port === "43187") return route.fulfill({ headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:3127", "Access-Control-Allow-Headers": "Authorization, Content-Type" }, json: {} });
    return route.continue();
  });
  return state;
}

async function paste(page: Page, value: string) {
  const input = page.getByRole("textbox", { name: "Link to read", exact: true });
  await input.click();
  await expect(input.locator("..")).toHaveCSS("border-top-color", "rgba(249, 115, 22, 0.5)");
  await input.evaluate((input, text) => {
    const data = new DataTransfer(); data.setData("text/plain", text);
    input.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, value);
}

test("pasting a full link keeps the hero, opens the local workspace and starts once without old content", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Your feed/ })).toBeVisible();
  await expect(page).toHaveURL(/:\d+\/$/);
  const tabCount = page.context().pages().length;
  await page.getByRole("navigation").getByRole("link", { name: "Analyse", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Link to read", exact: true })).toBeFocused();
  expect(page.context().pages()).toHaveLength(tabCount);
  await paste(page, target);
  await expect(page).toHaveURL(/\/replicate\/local\?link=/);
  await expect.poll(() => state.captures.length).toBe(1);
  expect(state.captures).toEqual([{ url: target, provider: "auto" }]);
  await expect(page.getByLabel("Content link", { exact: true })).toHaveValue(target);
  await expect(page.getByRole("region", { name: "Add content" }).getByRole("status")).toBeVisible();
  await expect(page.getByLabel("Ask about your content")).toHaveCount(0);
  expect(state.chatReads).toBe(0); expect(state.analyses).toBe(0);
  expect(state.errors).toEqual([]);
});

test("typing waits for Enter; invalid and internal URLs do not navigate or start capture", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Link to read", exact: true });
  await paste(page, "javascript:alert(1)");
  await expect(page).toHaveURL(/:\d+\/$/);
  for (const invalid of ["https://", "https://localhost/", "https://127.0.0.1/", "not a link"]) {
    await input.fill(invalid); await input.press("Enter");
    await expect(page.getByText(/doesn't look like a link/)).toBeVisible();
    await expect(page).toHaveURL(/:\d+\/$/);
  }
  expect(state.captures).toHaveLength(0);
  await input.fill(target);
  expect(state.captures).toHaveLength(0);
  await input.press("Enter");
  await expect.poll(() => state.captures.length).toBe(1);
});

test("a rejected start keeps its link for an explicit retry and never repeats on reload", async ({ page }) => {
  const state = await fixture(page, { reject: true });
  await page.goto("/"); await paste(page, target);
  await expect(page.getByRole("region", { name: "Add content" }).getByRole("alert")).toContainText("Fixture reader is unavailable");
  await expect(page.getByLabel("Content link", { exact: true })).toHaveValue(target);
  await page.reload();
  await expect(page.getByLabel("Content link", { exact: true })).toHaveValue(target);
  await expect(page.getByRole("button", { name: "Read this link", exact: true })).toBeEnabled();
  expect(state.captures).toHaveLength(1);
  await page.getByRole("button", { name: "Read this link", exact: true }).click();
  await expect.poll(() => state.captures.length).toBe(2);
  expect(state.chatReads).toBe(0); expect(state.errors).toEqual([]);
});

test("a query link without a matching one-use browser handoff only prefills", async ({ page }) => {
  const state = await fixture(page);
  await page.goto(`/replicate/local?link=${encodeURIComponent(target)}&handoff=aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa`);
  await expect(page.getByLabel("Content link", { exact: true })).toHaveValue(target);
  await expect(page.getByRole("button", { name: "Read this link", exact: true })).toBeEnabled();
  expect(state.captures).toHaveLength(0); expect(state.chatReads).toBe(0);
});

test("editing a failed handoff moves the pending workspace to the new accepted link", async ({ page }) => {
  const state = await fixture(page, { reject: true });
  await page.goto("/"); await paste(page, target);
  await expect(page.getByRole("region", { name: "Add content" }).getByRole("alert")).toContainText("Fixture reader is unavailable");
  const replacement = "https://github.com/example/another-fixture";
  state.reject = false;
  await page.getByLabel("Content link", { exact: true }).fill(replacement);
  await page.getByRole("button", { name: "Read this link", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("link")).toBe(replacement);
  await expect(page.getByLabel("Content link", { exact: true })).toHaveValue(replacement);
  expect(new URL(page.url()).searchParams.has("handoff")).toBe(false);
  expect(state.captures).toEqual([{ url: target, provider: "auto" }, { url: replacement, provider: "auto" }]);
  expect(state.chatReads).toBe(0); expect(state.errors).toEqual([]);
});

test("switching a failed handoff to an accepted upload clears the old link filter", async ({ page }) => {
  const state = await fixture(page, { reject: true });
  await page.goto("/"); await paste(page, target);
  await expect(page.getByRole("region", { name: "Add content" }).getByRole("alert")).toContainText("Fixture reader is unavailable");
  await page.getByRole("button", { name: "Upload the file instead", exact: true }).click();
  await page.getByLabel("Choose content file", { exact: true }).setInputFiles({ name: "fixture.txt", mimeType: "text/plain", buffer: Buffer.from("Fixture note") });
  await page.getByRole("button", { name: "Read this file", exact: true }).click();
  await expect(page).toHaveURL(/\/replicate\/local$/);
  expect(state.uploads).toBe(1); expect(state.captures).toHaveLength(1);
  await expect(page.getByText("Another link is being read.", { exact: false })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test("hosted paste requires sign-in, preserves the link and never claims analysis has started", async ({ page }) => {
  test.skip(!process.env.LANDING_HOSTED_TEST_URL, "Needs the production-mode fixture URL, not a dev-server Host override.");
  const state = await fixture(page);
  await page.goto(process.env.LANDING_HOSTED_TEST_URL!); await paste(page, target);
  await expect(page).toHaveURL(/\/login\?next=\/share&url=/);
  await expect(page.getByRole("heading", { name: "Welcome to ContextDrop" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("url")).toBe(target);
  await expect(page.getByRole("link", { name: "Continue with Google" })).toHaveAttribute("href", "/api/auth/google");
  await expect(page.getByText(/analysing your link|Takes about 30 seconds/)).toHaveCount(0);
  expect(state.captures).toHaveLength(0); expect(state.analyses).toBe(0);
  expect(state.userReads).toBeGreaterThanOrEqual(1); expect(state.errors).toEqual([]);
});
