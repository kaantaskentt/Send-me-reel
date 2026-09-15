import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

export interface ExistingChromeConnection {
  mode: 'existing-chrome';
  /** Exact, user-selected local pairing tab. Never guess a profile or reuse another tab. */
  markerUrl?: string;
}

export const CHROME_SETUP_MESSAGE = 'Connect your Chrome first. Open the connection page in your usual Chrome profile, then enable Remote Debugging in Chrome and allow the connection.';

export function parseChromeDebugEndpoint(text: string): string {
  if (text.length > 1024) throw new Error('Chrome connection details are invalid.');
  const lines = text.trim().split(/\r?\n/);
  if (lines.length !== 2 || !/^\d{1,5}$/.test(lines[0]) || !/^\/devtools\/browser\/[a-zA-Z0-9-]{8,100}$/.test(lines[1])) throw new Error('Chrome connection details are invalid.');
  const port = Number(lines[0]);
  if (port < 1024 || port > 65535) throw new Error('Chrome connection details are invalid.');
  return `ws://127.0.0.1:${port}${lines[1]}`;
}

export function validChromeMarker(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && url.hostname === '127.0.0.1' && Boolean(url.port) && !url.username && !url.password && !url.search && !url.hash && /^\/browser\/pair\/[a-zA-Z0-9_-]{43}$/.test(url.pathname);
  } catch { return false; }
}

export async function connectExistingChrome(
  selection: ExistingChromeConnection,
  dependencies: { readEndpoint?: () => Promise<string>; connect?: typeof chromium.connectOverCDP } = {},
): Promise<{ browser: Browser; context: BrowserContext; marker: Page }> {
  if (!selection.markerUrl || !validChromeMarker(selection.markerUrl)) throw new Error(CHROME_SETUP_MESSAGE);
  const readEndpoint = dependencies.readEndpoint || (async () => {
    if (process.platform !== 'darwin') throw new Error('Connecting your existing Chrome currently requires a Mac.');
    // This is Chrome's documented opt-in connection metadata, not cookies,
    // profile preferences, or a user-supplied debugging host.
    const filename = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome', 'DevToolsActivePort');
    const file = await fs.open(filename, 'r');
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > 1024) throw new Error('Invalid connection metadata');
      const buffer = Buffer.alloc(1025);
      const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
      if (bytesRead > 1024) throw new Error('Invalid connection metadata');
      return buffer.subarray(0, bytesRead).toString('utf8');
    } finally { await file.close(); }
  });
  let endpoint: string;
  try { endpoint = parseChromeDebugEndpoint(await readEndpoint()); }
  catch { throw new Error(CHROME_SETUP_MESSAGE); }
  let browser: Browser;
  try {
    browser = await (dependencies.connect || chromium.connectOverCDP.bind(chromium))(endpoint, { noDefaults: true, isLocal: true, timeout: 15_000 });
  } catch { throw new Error('Chrome did not connect. Check its Remote Debugging setting and choose Allow in Chrome, then try again.'); }
  try {
    // Read only tab URLs to locate the explicit pairing marker. Never read,
    // select, navigate, screenshot, or close existing account tabs.
    const matches = browser.contexts().flatMap(context => context.pages().filter(page => !page.isClosed() && page.url() === selection.markerUrl).map(marker => ({ context, marker })));
    if (matches.length !== 1) throw new Error('The connected Chrome is not the one you selected. Keep the connection page open in your usual profile and connect again.');
    return { browser, ...matches[0] };
  } catch (error) {
    // For connectOverCDP, close disconnects the client transport; it does not
    // send Browser.close or shut down the user's browser. Tested below.
    await browser.close().catch(() => {});
    throw error;
  }
}

/** A run can acquire only its new root tab and tabs opened by that tab. */
export class TaskTabScope {
  private readonly owned = new Set<Page>();
  constructor(private readonly onClaim: (page: Page) => void) {}
  claimRoot(page: Page) {
    if (this.owned.has(page)) return;
    this.owned.add(page); this.onClaim(page);
  }
  async owns(page: Page): Promise<boolean> {
    if (this.owned.has(page)) return true;
    const opener = await page.opener().catch(() => null);
    if (!opener || !this.owned.has(opener)) return false;
    this.claimRoot(page); return true;
  }
  pages() { return [...this.owned].filter(page => !page.isClosed()); }
  async close() { await Promise.allSettled(this.pages().map(page => page.close({ runBeforeUnload: false }))); }
}
