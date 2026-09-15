import { isLocalStudioRequest, readLocalCompanionToken } from './local-studio';

export class LocalChromeConnectionError extends Error {
  constructor(message: string, readonly status = 503) { super(message); }
}

export async function prepareLocalChromeConnection(headers: Pick<Headers, 'get'>, dependencies: {
  env?: NodeJS.ProcessEnv;
  readToken?: typeof readLocalCompanionToken;
  fetcher?: typeof fetch;
} = {}): Promise<{ setupUrl: string }> {
  if (!isLocalStudioRequest(headers, true, dependencies.env || process.env)) throw new LocalChromeConnectionError('Not available.', 404);
  const host = headers.get('host')!;
  const token = await (dependencies.readToken || readLocalCompanionToken)(host);
  if (!token) throw new LocalChromeConnectionError('Start ContextDrop on this Mac first.');
  try {
    const response = await (dependencies.fetcher || fetch)('http://127.0.0.1:43187/browser/connect', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, Origin: `http://${host}` },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error('No connection'); }
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        bytes += value.byteLength; if (bytes > 4096) throw new Error('Invalid connection response');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof data.setupUrl !== 'string' || !/^http:\/\/127\.0\.0\.1:43187\/browser\/pair\/[a-zA-Z0-9_-]{43}$/.test(data.setupUrl)) throw new Error('Invalid connection response');
    return { setupUrl: data.setupUrl };
  } catch { throw new LocalChromeConnectionError('Could not reach your Mac. Restart ContextDrop and try again.'); }
}
