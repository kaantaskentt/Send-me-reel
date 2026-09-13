import { defineConfig } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
  testDir: '.', testMatch: 'replication-recovery.spec.ts', timeout: 60_000,
  fullyParallel: false, workers: 1, reporter: 'list',
  outputDir: path.join(os.tmpdir(), 'contextdrop-replication-recovery-test'),
  use: { baseURL: process.env.CONTENT_STUDIO_TEST_URL || 'http://127.0.0.1:3127', headless: true, viewport: { width: 1440, height: 1000 }, trace: 'off', screenshot: 'only-on-failure', launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {} },
});
