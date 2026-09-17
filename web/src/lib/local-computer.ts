import { isLocalStudioRequest, readLocalCompanionToken } from './local-studio';

export interface LocalComputerSetup {
  configured: boolean; available: boolean;
  status: 'unsupported' | 'not_installed' | 'wrong_version' | 'host_unavailable' | 'needs_permissions' | 'needs_model' | 'ready';
  message: string; version: string | null;
  permissions: { screenRecording: boolean; accessibility: boolean; eventSynthesizing: boolean };
  setupSteps: string[];
}
export function parseLocalComputerSetup(value: unknown): LocalComputerSetup | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const s = value as Record<string, unknown>;
  const permissions = s.permissions as LocalComputerSetup['permissions'] | undefined;
  if (typeof s.configured !== 'boolean' || typeof s.available !== 'boolean' || !['unsupported', 'not_installed', 'wrong_version', 'host_unavailable', 'needs_permissions', 'needs_model', 'ready'].includes(String(s.status)) || typeof s.message !== 'string' || s.message.length > 600 || (s.version !== null && typeof s.version !== 'string') || !permissions || !['screenRecording', 'accessibility', 'eventSynthesizing'].every(key => typeof permissions[key as keyof typeof permissions] === 'boolean') || !Array.isArray(s.setupSteps) || s.setupSteps.length > 8 || !s.setupSteps.every(step => typeof step === 'string' && step.length < 1000)) return;
  if (s.available && (s.status !== 'ready' || !s.configured || !permissions.screenRecording || !permissions.accessibility)) return;
  return { configured: s.configured, available: s.available, status: s.status as LocalComputerSetup['status'], message: s.message, version: typeof s.version === 'string' ? s.version.slice(0, 40) : null, permissions: { screenRecording: permissions.screenRecording, accessibility: permissions.accessibility, eventSynthesizing: permissions.eventSynthesizing }, setupSteps: s.setupSteps };
}
export class LocalComputerError extends Error {
  constructor(message: string, readonly status = 503) { super(message); }
}
export async function localComputerSetup(headers: Pick<Headers, 'get'>, action?: 'open_helper', dependencies: {
  env?: NodeJS.ProcessEnv; readToken?: typeof readLocalCompanionToken; fetcher?: typeof fetch;
} = {}): Promise<LocalComputerSetup | { status: 'opened'; message: string }> {
  if (!isLocalStudioRequest(headers, Boolean(action), dependencies.env || process.env)) throw new LocalComputerError('Not available.', 404);
  const host = headers.get('host')!;
  const token = await (dependencies.readToken || readLocalCompanionToken)(host);
  if (!token) throw new LocalComputerError('Start ContextDrop on this Mac first.');
  try {
    const response = await (dependencies.fetcher || fetch)('http://127.0.0.1:43187/computer/setup', {
      method: action ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, Origin: `http://${host}`, ...(action ? { 'Content-Type': 'application/json' } : {}) },
      body: action ? JSON.stringify({ action }) : undefined,
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30_000),
    });
    if (!response.body) throw new Error('Empty response');
    const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 16_384) throw new Error('Large response'); chunks.push(value); } }
    finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!response.ok) throw new LocalComputerError(typeof result.error === 'string' ? result.error.slice(0, 600) : 'Open the Mac helper and check again.', response.status === 409 ? 409 : 503);
    if (action && result.status === 'opened' && typeof result.message === 'string') return { status: 'opened', message: result.message.slice(0, 600) };
    const setup = parseLocalComputerSetup(result);
    if (!action && setup) return setup;
    throw new Error('Invalid helper response');
  } catch (error) {
    if (error instanceof LocalComputerError) throw error;
    throw new LocalComputerError('Could not reach Mac control. Keep ContextDrop running and try again.');
  }
}
