import { test, expect, type Page } from "@playwright/test";
import { SignJWT } from "jose";

// ============================================================
// Chat Demo — visually shows step 1 (markdown) working in /chat
// Run: cd web && npx playwright test chat-demo --headed
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET ?? process.env.PW_JWT_SECRET ?? "";
const TEST_USER = {
  sub: "e4065b0b-ef97-4553-93b1-4d8dfa5d266e", // Kaan's user ID
  username: "taskentkaan@gmail.com",
  tid: 0,
};

async function loginAs(page: Page) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const token = await new SignJWT(TEST_USER as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .setIssuedAt()
    .sign(secret);

  await page.context().addCookies([
    {
      name: "cd_session",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

test("chat: send message and watch markdown render", async ({ page }) => {
  await loginAs(page);

  // 1. Open the chat page (use domcontentloaded — networkidle hangs on
  //    long-poll/SSE keepalives common in chat UIs)
  await page.goto("/chat", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForLoadState("domcontentloaded");
  await page.screenshot({ path: "test-results/chat-01-loaded.png", fullPage: true });

  // 2. The page lists analyses — pick the first one (or use ?analysis= param if needed)
  // Wait for the analyses list to appear
  await page.waitForTimeout(1500);

  // Try to click an analysis card if a selector dropdown is shown
  const selectorOpen = await page.locator("text=/select an analysis/i").first().isVisible().catch(() => false);
  if (selectorOpen) {
    // Open the picker and pick whatever's first
    await page.locator("text=/select an analysis/i").first().click();
    await page.waitForTimeout(500);
    const firstOption = page.locator("[role=option], button").filter({ hasText: /reel|article|video|/ }).first();
    await firstOption.click().catch(() => {});
  }

  await page.screenshot({ path: "test-results/chat-02-analysis-selected.png", fullPage: true });

  // 3. Type a message that asks the bot to use markdown
  const composer = page.locator("input[placeholder*=\"Ask\"], textarea[placeholder*=\"Ask\"]").first();
  await expect(composer).toBeVisible({ timeout: 5000 });
  await composer.fill("Reply with one short sentence using **bold**, *italic*, and a [link](https://example.com).");
  await page.screenshot({ path: "test-results/chat-03-typed.png", fullPage: true });

  // 4. Submit (Enter or button)
  await composer.press("Enter");

  // 5. Watch the assistant message stream in
  // The Markdown component wraps content in <div class="cd-markdown">
  await page.waitForSelector(".cd-markdown", { timeout: 30_000 });
  await page.waitForTimeout(2000); // let stream complete a bit
  await page.screenshot({ path: "test-results/chat-04-streaming.png", fullPage: true });

  // 6. Wait for stream to finish (or timeout) and capture final state
  await page.waitForTimeout(8000);
  await page.screenshot({ path: "test-results/chat-05-final.png", fullPage: true });

  // 7. Assert that markdown actually rendered — bold tags should exist inside .cd-markdown
  const boldCount = await page.locator(".cd-markdown strong").count();
  console.log(`Found ${boldCount} <strong> elements in assistant messages`);
  expect(boldCount).toBeGreaterThan(0);

  // 8. Assert no literal asterisks survived
  const markdownText = await page.locator(".cd-markdown").first().innerText();
  console.log("Assistant message rendered as:\n", markdownText);
  expect(markdownText).not.toContain("**");
});
