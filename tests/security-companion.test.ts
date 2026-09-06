import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { AddressInfo } from 'node:net';
import { createBrowserEgress } from '../companion/egress.js';
import { GuidedBrowserRun, parseBrowserAction, parseBrowserPlannerResponse, browserActionResponseSchema, type BrowserAction } from '../companion/browser.js';

test('planner response schema excludes extra click text and its envelope still fails closed', () => {
  const click = { type: 'click', description: 'Generate the preview', targetId: 'e1', url: null, text: null };
  assert.deepEqual(parseBrowserPlannerResponse({ action: click }), click);
  assert.throws(() => parseBrowserPlannerResponse({ action: click, extra: 'ignored instruction' }), /planner response/);
  assert.throws(() => parseBrowserPlannerResponse({ action: { ...click, text: 'unexpected input' } }), /cannot include text/);
  const alternatives = browserActionResponseSchema.properties.action.anyOf;
  assert.equal(alternatives.length, 8);
  const clickSchema = alternatives.find(schema => schema.properties.type.enum[0] === 'click')!;
  assert.equal(clickSchema.properties.text.type, 'null');
  assert.equal(clickSchema.properties.url.type, 'null');
  assert.equal(clickSchema.properties.targetId.type, 'string');
  const fillSchema = alternatives.find(schema => schema.properties.type.enum[0] === 'fill')!;
  assert.equal(fillSchema.properties.text.type, 'string');
});

test('browser actions cannot smuggle a second operation through irrelevant fields', () => {
  const base = { type: 'navigate', description: 'Open the page', targetId: null, url: 'https://example.com', text: null };
  assert.throws(() => parseBrowserAction({ ...base, targetId: 'e1' }), /cannot target/);
  assert.throws(() => parseBrowserAction({ ...base, text: 'unapproved input' }), /cannot include text/);
  assert.throws(() => parseBrowserAction({ ...base, type: 'click', targetId: 'e1' }), /Only navigation/);
});

test('closing browser egress during DNS resolution cannot create a late upstream connection', async () => {
  let hits = 0;
  const fixture = http.createServer((_request, response) => { hits++; response.end('unexpected'); });
  fixture.listen(0, '127.0.0.1');
  await once(fixture, 'listening');
  const url = `http://127.0.0.1:${(fixture.address() as AddressInfo).port}/`;
  let signalLookup!: () => void;
  const lookupStarted = new Promise<void>(resolve => { signalLookup = resolve; });
  let releaseLookup!: (value: any) => void;
  const pendingLookup = new Promise<any>(resolve => { releaseLookup = resolve; });
  const egress = await createBrowserEgress(async () => { signalLookup(); return pendingLookup; });
  const request = http.get(egress.url, { path: url });
  request.on('error', () => {});
  try {
    await lookupStarted;
    egress.close();
    releaseLookup({ url: new URL(url), addresses: [{ address: '127.0.0.1', family: 4 }] });
    await new Promise<void>(resolve => setImmediate(resolve));
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(hits, 0);
  } finally {
    request.destroy(); egress.close(); fixture.closeAllConnections();
    await new Promise<void>(resolve => fixture.close(() => resolve()));
  }
});

test('closing browser egress interrupts an in-flight HTTP response upstream', async () => {
  let signalConnected!: () => void;
  let signalClosed!: () => void;
  const connected = new Promise<void>(resolve => { signalConnected = resolve; });
  const disconnected = new Promise<void>(resolve => { signalClosed = resolve; });
  const fixture = http.createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' }); response.write('started');
    response.on('close', signalClosed); signalConnected();
  });
  fixture.listen(0, '127.0.0.1'); await once(fixture, 'listening');
  const url = `http://127.0.0.1:${(fixture.address() as AddressInfo).port}/`;
  const egress = await createBrowserEgress(async value => ({ url: new URL(value), addresses: [{ address: '127.0.0.1', family: 4 }] }));
  const request = http.get(egress.url, { path: url }); request.on('error', () => {});
  try {
    await connected; egress.close();
    await Promise.race([disconnected, new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('Upstream connection survived stop')), 2000); timer.unref(); })]);
  } finally {
    request.destroy(); egress.close(); fixture.closeAllConnections();
    await new Promise<void>(resolve => fixture.close(() => resolve()));
  }
});

test('replacing a previewed DOM node with an identical clone invalidates approval', async () => {
  const fixture = http.createServer((_request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>Node identity fixture</title><button onclick="document.body.dataset.clicked=\'yes\'">Create result</button>');
  });
  fixture.listen(0, '127.0.0.1'); await once(fixture, 'listening');
  const url = `http://127.0.0.1:${(fixture.address() as AddressInfo).port}/`;
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'contextdrop-stale-target-'));
  const run = new GuidedBrowserRun({ workspace, headless: true, onState: () => {},
    validateUrl: async value => { assert.equal(value, url); },
    resolveDestination: async value => ({ url: new URL(value), addresses: [{ address: '127.0.0.1', family: 4 }] }),
    planner: async observation => ({ type: observation.url === 'about:blank' ? 'navigate' : 'click', description: 'Create the fixture result', targetId: observation.url === 'about:blank' ? null : observation.controls[0]!.id, url: observation.url === 'about:blank' ? url : null, text: null } as BrowserAction),
  });
  try {
    await run.start(); assert.equal(run.state.status, 'awaiting_approval', run.state.message);
    await run.approve(run.state.pendingAction!.id, true);
    assert.equal(run.state.pendingAction?.type, 'click');
    const page = (run as any).page;
    await page.evaluate(() => { const button = document.querySelector('button')!; button.replaceWith(button.cloneNode(true)); });
    await run.approve(run.state.pendingAction!.id, true);
    assert.equal(run.state.status, 'needs_input');
    assert.match(run.state.message || '', /Target changed/);
    assert.equal(await page.evaluate(() => document.body.dataset.clicked), undefined);
    assert.equal(run.state.history.filter(item => item.status === 'performed').length, 1);
  } finally {
    await run.stop(); fixture.closeAllConnections();
    await new Promise<void>(resolve => fixture.close(() => resolve()));
    await fs.rm(workspace, { recursive: true, force: true });
  }
});
