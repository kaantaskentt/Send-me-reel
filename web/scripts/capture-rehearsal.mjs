import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseURL = process.env.REPLICATION_TEST_URL || "http://127.0.0.1:3127";
const output = resolve("public/rehearsal");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`${baseURL}/replicate/demo/source`);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: `${output}/light-desktop.png` });
  await page.getByRole("button", { name: "Switch page theme" }).click();
  if (await page.locator("[data-rehearsal-source]").getAttribute("data-theme") !== "dark") throw new Error("Theme change failed");
  await page.screenshot({ path: `${output}/dark-desktop.png` });
  await page.getByRole("button", { name: "Show mobile preview" }).click();
  if (await page.locator("[data-rehearsal-source]").getAttribute("data-preview") !== "mobile") throw new Error("Mobile preview failed");
  await page.screenshot({ path: `${output}/dark-mobile.png` });
  process.stdout.write(`Captured three verified local fixture states in ${output}\n`);
} finally { await browser.close(); }
