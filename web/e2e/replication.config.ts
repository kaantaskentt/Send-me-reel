import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "replication.spec.ts", timeout: 45_000,
  fullyParallel: false, workers: 1, reporter: "list",
  outputDir: "/private/tmp/contextdrop-replication-qa/test-output",
  use: { baseURL: process.env.REPLICATION_TEST_URL || "http://127.0.0.1:3127", headless: true, viewport: { width: 1440, height: 1000 }, screenshot: "only-on-failure", trace: "retain-on-failure", launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {} },
});
