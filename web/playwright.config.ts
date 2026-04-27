import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: {
    baseURL: process.env.PW_BASE_URL || "https://send-me-reel.vercel.app",
    screenshot: "on",
    trace: "on-first-retry",
    launchOptions: {
      slowMo: 500,
    },
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "Mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  reporter: [["html", { open: "never" }]],
  outputDir: "./test-results",
});
