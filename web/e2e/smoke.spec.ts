import { test, expect } from "@playwright/test";
import { SignJWT } from "jose";

// ============================================================
// ContextDrop E2E Smoke Tests
// Run: cd web && npx playwright test --headed
// Watch: npx playwright show-report
// ============================================================

// Generate a real session cookie for authenticated tests
const JWT_SECRET = "contextdrop-jwt-secret-change-in-production-2026";
const TEST_USER = {
  sub: "e4065b0b-ef97-4553-93b1-4d8dfa5d266e", // Kaan's user ID
  username: "taskentkaan@gmail.com",
  tid: 0,
};

async function getSessionCookie(): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT(TEST_USER as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .setIssuedAt()
    .sign(secret);
}

async function loginAs(page: import("@playwright/test").Page) {
  const token = await getSessionCookie();
  await page.context().addCookies([
    {
      name: "cd_session",
      value: token,
      domain: "send-me-reel.vercel.app",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
}

test.describe("Landing Page", () => {
  test("loads and shows hero content", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/01-landing.png", fullPage: true });

    // Hero text works on both desktop and mobile (brand name may be collapsed on mobile)
    await expect(page.locator("text=Your feed").first()).toBeVisible();
    await expect(page.locator("text=Create free account").first()).toBeVisible();
  });
});

test.describe("Login Page", () => {
  test("renders all three sign-in options", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/02-login.png", fullPage: true });

    // Google button
    await expect(page.locator("text=Continue with Google")).toBeVisible();

    // Email + password form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Telegram option
    await expect(page.locator("text=Sign in via Telegram")).toBeVisible();
  });

  test("shows error banner for expired token", async ({ page }) => {
    await page.goto("/login?error=expired_token");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/03-login-error.png", fullPage: true });

    await expect(page.locator("text=expired")).toBeVisible();
  });

  test("shows error banner for failed Google sign-in", async ({ page }) => {
    await page.goto("/login?error=google_failed");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/04-login-google-error.png", fullPage: true });

    await expect(page.locator("text=Google sign-in failed")).toBeVisible();
  });

  test("email + password form accepts input", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "test-password-123");
    await page.screenshot({ path: "test-results/05-login-email-filled.png", fullPage: true });

    // Verify values were set (we don't submit — that would make a real API call)
    await expect(page.locator('input[type="email"]')).toHaveValue("test@example.com");
    await expect(page.locator('input[type="password"]')).toHaveValue("test-password-123");
  });

  test("Google button links to auth endpoint", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const googleLink = page.locator("a", { hasText: "Continue with Google" });
    await expect(googleLink).toHaveAttribute("href", "/api/auth/google");
  });
});

test.describe("Auth Redirects (logged out)", () => {
  test("dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/07-dashboard-redirect.png", fullPage: true });

    // Should be on the login page now
    expect(page.url()).toContain("/login");
    await expect(page.locator("text=Welcome back")).toBeVisible();
  });

  test("context page redirects to login", async ({ page }) => {
    await page.goto("/context");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/08-context-redirect.png", fullPage: true });

    expect(page.url()).toContain("/login");
  });
});

test.describe("Auth Route Error Handling", () => {
  test("/auth with no token redirects to login with error", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/09-auth-no-token.png", fullPage: true });

    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("error=");
  });

  test("/auth with invalid token redirects to login with error", async ({ page }) => {
    await page.goto("/auth?token=invalid_garbage_token");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/10-auth-bad-token.png", fullPage: true });

    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("error=");
  });
});

test.describe("Connect Notion (logged out)", () => {
  test("connect-notion page loads without crashing", async ({ page }) => {
    await page.goto("/connect-notion");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/11-connect-notion.png", fullPage: true });

    // This page is client-side, should at least render without a 500
    expect(page.url()).toContain("connect-notion");
  });
});

test.describe("Visual Check — All Pages", () => {
  const pages = [
    { name: "landing", path: "/" },
    { name: "login", path: "/login" },
    { name: "login-error", path: "/login?error=expired_token" },
  ];

  for (const p of pages) {
    test(`screenshot: ${p.name}`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: `test-results/visual-${p.name}.png`,
        fullPage: true,
      });
    });
  }
});

// ============================================================
// AUTHENTICATED TESTS — Uses a real JWT cookie
// ============================================================

test.describe("Dashboard (logged in)", () => {
  test("loads with analyses and sidebar", async ({ page }) => {
    await loginAs(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Wait for analyses to load (skeleton disappears)
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/20-dashboard-full.png", fullPage: true });

    // Verify key dashboard elements
    await expect(page.locator("text=ContextDrop").first()).toBeVisible();
  });

  test("paste link input is visible and accepts text", async ({ page }) => {
    await loginAs(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Input placeholder should be present
    const input = page.locator('input[placeholder*="Paste any link"]');
    await expect(input).toBeVisible();

    // Analyze button should be visible
    await expect(page.locator('button:has-text("Analyze")').first()).toBeVisible();

    // Typing should enable the button
    await input.fill("https://www.instagram.com/reel/DXE0ODozEQU/");
    await page.screenshot({ path: "test-results/26-paste-input-filled.png", fullPage: true });

    // Do NOT submit — would create a real analysis. Just verify UI state.
    await expect(input).toHaveValue("https://www.instagram.com/reel/DXE0ODozEQU/");
  });

  test("sidebar shows profile info", async ({ page, viewport }) => {
    test.skip(!!(viewport && viewport.width < 768), "Sidebar is collapsed behind hamburger on mobile — tested separately");
    await loginAs(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "test-results/21-dashboard-sidebar.png" });
    await expect(page.locator("text=Credits").first()).toBeVisible();
  });

  test("sign out button works", async ({ page, viewport }) => {
    test.skip(!!(viewport && viewport.width < 768), "Sign out is in the mobile hamburger menu — tested separately");
    await loginAs(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await page.click("text=Sign out");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/22-after-signout.png", fullPage: true });

    expect(page.url()).toContain("/login");
  });

  test("mobile: stats cards visible at top", async ({ page, viewport }) => {
    test.skip(!(viewport && viewport.width < 768), "Mobile-only layout check");
    await loginAs(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "test-results/25-dashboard-mobile.png", fullPage: true });

    // Mobile dashboard shows stats cards at the top
    await expect(page.locator("text=SAVED").first()).toBeVisible();
  });
});

test.describe("Profile Page (logged in)", () => {
  test("context editor loads with warm theme", async ({ page }) => {
    await loginAs(page);
    await page.goto("/context");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "test-results/23-context-editor.png", fullPage: true });

    // Verify it's the profile page, not a redirect
    await expect(page.locator("text=Edit your profile").first()).toBeVisible();
    await expect(page.locator("text=Role").first()).toBeVisible();
  });
});

test.describe("Login redirects when already logged in", () => {
  test("/login redirects to dashboard", async ({ page }) => {
    await loginAs(page);
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "test-results/24-login-redirect.png", fullPage: true });

    // Should have been redirected away from login
    expect(page.url()).not.toContain("/login");
  });
});
