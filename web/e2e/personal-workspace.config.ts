import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "personal-workspace.spec.ts", timeout: 45_000,
  fullyParallel: false, workers: 1, reporter: "list",
  outputDir: "/private/tmp/contextdrop-personal-qa/test-output",
  use: {
    baseURL: process.env.CONTENT_STUDIO_TEST_URL || "http://127.0.0.1:3127",
    // The page receives a real, transient pairing token. Avoid persisting it in network traces.
    headless: true, viewport: { width: 1440, height: 1000 }, screenshot: "only-on-failure", trace: "off",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
  },
});
