import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLocalChromeConnection } from '../src/lib/local-chrome-connection';
import { readLocalHealth } from '../src/lib/local-health';

const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', CONTEXTDROP_LOCAL_STUDIO: '1' };
const headers = new Headers({ host: '127.0.0.1:3127', origin: 'http://127.0.0.1:3127' });
const setupUrl = `http://127.0.0.1:43187/browser/pair/${'a'.repeat(43)}`;

test('Chrome setup refuses production, cross-origin and remote requests before reading local credentials', async () => {
  let reads = 0;
  const readToken = async () => { reads++; return 'private-token'; };
  for (const [requestHeaders, requestEnv] of [[headers, { ...env, NODE_ENV: 'production' }], [new Headers({ host: 'contextdrop.ai', origin: 'https://contextdrop.ai' }), env], [new Headers({ host: '127.0.0.1:3127', origin: 'https://other.example' }), env], [new Headers({ host: '127.0.0.1:3127' }), env]] as const) {
    await assert.rejects(prepareLocalChromeConnection(requestHeaders, { env: requestEnv, readToken }), { status: 404 });
  }
  assert.equal(reads, 0);
});

test('Chrome setup keeps the API token server-side and permits only a fixed local selection URL', async () => {
  const result = await prepareLocalChromeConnection(headers, { env, readToken: async () => 'private-token', fetcher: (async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:43187/browser/connect'); assert.equal(options?.method, 'POST'); assert.equal(options?.redirect, 'error');
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer private-token');
    return Response.json({ setupUrl, token: 'private-token', status: 'awaiting_selection' });
  }) as typeof fetch });
  assert.deepEqual(result, { setupUrl });
  for (const response of [Response.json({ setupUrl: 'https://other.example' }), Response.json({ setupUrl: setupUrl + '?secret=x' }), new Response('x'.repeat(5000)), new Response('private upstream error', { status: 500 })]) {
    await assert.rejects(prepareLocalChromeConnection(headers, { env, readToken: async () => 'private-token', fetcher: (async () => response) as typeof fetch }), error => error instanceof Error && !error.message.includes('private') && !error.message.includes('other.example'));
  }
});

test('browser selection is not reported as an established Chrome connection', async () => {
  const harness = { codex: false, claude: false };
  const health = await readLocalHealth(headers, { env, readToken: async () => 'private-token', fetcher: (async () => Response.json({ version: 1, status: 'unavailable', companion: 'reachable', platform: 'darwin', execution: null, capabilities: { terminal: false, harnesses: harness, browser: { configured: true, mode: 'existing-chrome', connection: 'selected' } } })) as typeof fetch });
  assert.equal(health?.companion.connected, true);
  assert.equal(health?.companion.browserConnection, 'selected');
  assert.equal(health?.companion.terminal, false);
  assert.equal(health?.companion.execution, null);
});
