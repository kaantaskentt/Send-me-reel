import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { AddressInfo } from 'node:net';
import { createCompanionServer } from '../companion/server.js';
import { inspectConnections } from '../companion/connections.js';

test('Chrome selection page requires API-issued nonce and an explicit same-origin form submission', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-chrome-pairing-'));
  const token = 'private-companion-api-token-never-in-a-page-url';
  const appOrigin = 'http://127.0.0.1:3127';
  const server = createCompanionServer({ token, rootDir: directory, allowedOrigins: [appOrigin], platform: 'darwin', inspectSetup: () => inspectConnections({ platform: 'darwin' }, {}) });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const headers = { Authorization: `Bearer ${token}`, Origin: appOrigin };
  try {
    assert.equal((await fetch(`${base}/browser/connect`, { method: 'POST' })).status, 401);
    assert.equal((await fetch(`${base}/browser/connect`, { method: 'POST', headers: { ...headers, Origin: 'https://other.example' } })).status, 403);
    const { setupUrl } = await (await fetch(`${base}/browser/connect`, { method: 'POST', headers })).json();
    assert.ok(!setupUrl.includes(token));
    const page = await fetch(setupUrl);
    assert.equal(page.status, 200); assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
    assert.match(page.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
    assert.match(await page.text(), /Connect this Chrome/);
    assert.equal((await fetch(setupUrl, { method: 'POST' })).status, 403);
    assert.equal((await fetch(setupUrl, { method: 'POST', headers: { Origin: 'https://other.example' } })).status, 403);
    const selected = await fetch(setupUrl, { method: 'POST', headers: { Origin: base } });
    assert.equal(selected.status, 200); assert.match(await selected.text(), /This is your Chrome/);
    const health = await (await fetch(`${base}/health`, { headers })).json();
    assert.equal(health.capabilities.browser.mode, 'existing-chrome');
    assert.equal(health.capabilities.browser.connection, 'selected');
    assert.equal((await fetch(`${base}/runs`)).status, 401);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await fs.rm(directory, { recursive: true, force: true }); }
});
