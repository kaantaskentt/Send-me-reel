import test from 'node:test';
import assert from 'node:assert/strict';
import { localComputerSetup, parseLocalComputerSetup } from '../src/lib/local-computer';

const setup = { configured: true, available: true, status: 'ready', version: '4.4.0', message: 'Ready', permissions: { screenRecording: true, accessibility: true, eventSynthesizing: false }, setupSteps: [] };
const headers = new Headers({ host: '127.0.0.1:3127', origin: 'http://127.0.0.1:3127' });
const env = { NODE_ENV: 'development', CONTEXTDROP_LOCAL_STUDIO: '1' } as NodeJS.ProcessEnv;
test('native readiness never treats missing or denied permissions as connected', () => {
  assert.deepEqual(parseLocalComputerSetup(setup), setup);
  assert.equal(parseLocalComputerSetup({ ...setup, permissions: { screenRecording: true } }), undefined);
  assert.equal(parseLocalComputerSetup({ ...setup, permissions: { ...setup.permissions, accessibility: false } }), undefined);
  assert.equal(parseLocalComputerSetup({ ...setup, status: 'not_installed' }), undefined);
});
test('native setup is development-loopback only and refuses cross-origin writes before credentials', async () => {
  let accessed = 0;
  for (const [h, e] of [[headers, { ...env, NODE_ENV: 'production' }], [new Headers({ host: '127.0.0.1:3127', origin: 'https://evil.example' }), env], [new Headers({ host: 'contextdrop.ai', origin: 'https://contextdrop.ai' }), env]] as const) {
    await assert.rejects(localComputerSetup(h, 'open_helper', { env: e, readToken: async () => { accessed++; return 'secret'; } }), /Not available/);
  }
  assert.equal(accessed, 0);
});
test('native setup uses only a fixed paired endpoint and has no capture side effect', async () => {
  let request: RequestInit | undefined;
  const result = await localComputerSetup(headers, undefined, { env, readToken: async () => 'fixture-token', fetcher: async (url, init) => { assert.equal(url, 'http://127.0.0.1:43187/computer/setup'); request = init; return new Response(JSON.stringify(setup)); } });
  assert.deepEqual(result, setup); assert.equal(request?.method, 'GET'); assert.equal(request?.redirect, 'error');
  const opened = await localComputerSetup(headers, 'open_helper', { env, readToken: async () => 'fixture-token', fetcher: async (_url, init) => { assert.equal(init?.body, '{"action":"open_helper"}'); return new Response(JSON.stringify({ status: 'opened', message: 'Choose permissions in macOS.' })); } });
  assert.equal(opened.status, 'opened');
});
