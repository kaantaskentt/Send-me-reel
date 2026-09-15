import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { chromium, type Browser, type Page } from 'playwright';
import { connectExistingChrome, parseChromeDebugEndpoint, validChromeMarker, TaskTabScope } from '../companion/chrome-connector.js';
import { ChromePairing } from '../companion/chrome-pairing.js';
import { GuidedBrowserRun, type BrowserAction } from '../companion/browser.js';

const marker = `http://127.0.0.1:43187/browser/pair/${'a'.repeat(43)}`;
test('Chrome discovery accepts only a loopback browser endpoint from bounded metadata', () => {
  assert.equal(parseChromeDebugEndpoint('49152\n/devtools/browser/12345678-abcd\n'), 'ws://127.0.0.1:49152/devtools/browser/12345678-abcd');
  for (const value of ['80\n/devtools/browser/12345678', '65536\n/devtools/browser/12345678', '9222x\n/devtools/browser/12345678', '9222\n//evil.example/browser/12345678', '9222\n/devtools/browser/12345678?token=leak', '9222\n/devtools/page/12345678', '9222\n/devtools/browser/12345678\nextra', 'a'.repeat(2048)]) assert.throws(() => parseChromeDebugEndpoint(value));
  assert.equal(validChromeMarker(marker), true);
  for (const value of [marker.replace('127.0.0.1', 'localhost.evil.example'), marker + '?key=x', marker + '#x', marker.replace('/browser/pair/', '/runs/'), marker.replace('http:', 'https:')]) assert.equal(validChromeMarker(value), false);
});

test('explicit Chrome selection expires before confirmation and never exposes the API token', () => {
  let now = 0;
  const pairing = new ChromePairing(() => now);
  assert.equal(pairing.status, 'not_connected');
  const setup = pairing.create('http://127.0.0.1:43187');
  const token = new URL(setup).pathname.split('/').at(-1)!;
  assert.equal(pairing.status, 'awaiting_selection');
  assert.equal(pairing.markerUrl, undefined);
  assert.equal(pairing.accepts('x'.repeat(43)), false);
  now += 16 * 60_000;
  assert.throws(() => pairing.select(token), /expired/);
  const next = pairing.create('http://127.0.0.1:43187');
  assert.notEqual(next, setup);
  pairing.select(new URL(next).pathname.split('/').at(-1)!);
  assert.equal(pairing.markerUrl, next);
  assert.equal(pairing.status, 'selected');
  assert.throws(() => pairing.create('http://example.com:43187'));
});

test('missing or wrong-profile marker disconnects without launching or reading page contents', async () => {
  let connections = 0; let disconnects = 0;
  const connect = (async (_endpoint: unknown, options: unknown) => {
    connections++;
    assert.deepEqual(options, { noDefaults: true, isLocal: true, timeout: 15_000 });
    return { contexts: () => [{ pages: () => [{ url: () => 'https://mail.google.com/mail/u/0', isClosed: () => false }] }], close: async () => { disconnects++; } } as unknown as Browser;
  }) as typeof chromium.connectOverCDP;
  const dependencies = { readEndpoint: async () => '49152\n/devtools/browser/12345678-abcd', connect };
  await assert.rejects(connectExistingChrome({ mode: 'existing-chrome' }, dependencies), /Connect your Chrome first/);
  assert.equal(connections, 0);
  await assert.rejects(connectExistingChrome({ mode: 'existing-chrome', markerUrl: marker }, dependencies), /not the one you selected/);
  assert.equal(connections, 1); assert.equal(disconnects, 1);
});

test('tab ownership does not transfer to unrelated or existing account tabs', async () => {
  const makePage = (opener: Page | null = null) => ({ opener: async () => opener, isClosed: () => false, close: async () => {} }) as unknown as Page;
  const root = makePage(); const unrelated = makePage(); const taskPopup = makePage(root); const otherPopup = makePage(unrelated);
  const claimed: Page[] = [];
  const scope = new TaskTabScope(page => claimed.push(page));
  scope.claimRoot(root);
  assert.equal(await scope.owns(unrelated), false);
  assert.equal(await scope.owns(otherPopup), false);
  assert.equal(await scope.owns(taskPopup), true);
  assert.deepEqual(scope.pages(), [root, taskPopup]);
  assert.deepEqual(claimed, [root, taskPopup]);
});

test('connected browser tasks preserve user tabs and reject stale targets in a real isolated CDP fixture', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-chrome-connect-'));
  const profile = path.join(directory, 'fixture-profile');
  const workspace = path.join(directory, 'task'); await fs.mkdir(workspace);
  const fixture = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end(request.url === '/task' ? '<!doctype html><title>Task fixture</title><button onclick="document.body.dataset.done=\'yes\'">Build fixture</button>' : '<!doctype html><title>User fixture</title><h1>User tab untouched</h1>');
  });
  await new Promise<void>(resolve => fixture.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(fixture.address() as AddressInfo).port}`;
  const selectedUrl = `${origin}/browser/pair/${'b'.repeat(43)}`;
  const userContext = await chromium.launchPersistentContext(profile, { headless: true, args: ['--remote-debugging-port=0'] });
  const userTab = userContext.pages()[0]; await userTab.goto(`${origin}/user`);
  const selectedTab = await userContext.newPage(); await selectedTab.goto(selectedUrl);
  let borrowed: Browser | undefined;
  const action = (type: BrowserAction['type'], extra: Partial<BrowserAction> = {}): BrowserAction => ({ type, description: 'Controlled fixture action', targetId: null, url: null, text: null, ...extra });
  const run = new GuidedBrowserRun({ workspace, connection: { mode: 'existing-chrome', markerUrl: selectedUrl }, onState: () => {},
    connectChrome: async selection => {
      const connected = await connectExistingChrome(selection, { readEndpoint: () => fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8') });
      borrowed = connected.browser; return connected;
    },
    validateUrl: async value => { assert.equal(new URL(value).origin, origin); },
    planner: async observation => observation.url === 'about:blank' ? action('navigate', { url: `${origin}/task` }) : action('click', { targetId: observation.controls[0]!.id }),
  });
  try {
    await run.start(); assert.equal(run.state.status, 'awaiting_approval', run.state.message);
    await run.approve(run.state.pendingAction!.id, true);
    assert.equal(run.state.pendingAction?.type, 'click', run.state.message);
    const task = borrowed!.contexts()[0].pages().find(page => page.url() === `${origin}/task`)!;
    const extraUserTab = await userContext.newPage(); await extraUserTab.goto(`${origin}/unrelated`);
    assert.equal(run.state.currentUrl, `${origin}/task`);
    await task.evaluate(() => { const button = document.querySelector('button')!; button.replaceWith(button.cloneNode(true)); });
    await run.approve(run.state.pendingAction!.id, true);
    assert.equal(run.state.status, 'needs_input'); assert.match(run.state.message || '', /Target changed/);
    assert.equal(await task.evaluate(() => document.body.dataset.done), undefined);
    await run.stop();
    assert.equal(task.isClosed(), true);
    assert.equal(userTab.isClosed(), false); assert.equal(selectedTab.isClosed(), false); assert.equal(extraUserTab.isClosed(), false);
    assert.equal(await userTab.locator('h1').textContent(), 'User tab untouched');
    assert.equal(userContext.browser()?.isConnected(), true);
  } finally {
    await run.stop(); await userContext.close(); fixture.closeAllConnections();
    await new Promise<void>(resolve => fixture.close(() => resolve()));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
