import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const RUN_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export const RUN_STATUSES = new Set(['launching', 'running', 'stopping', 'awaiting_approval', 'needs_input', 'failed', 'interrupted', 'stopped', 'finished_unverified']);
export interface TextSnapshot { text: string; truncated: boolean; updatedAt: string | null; }
export interface TaskProgress {
  phase: 'starting' | 'reading' | 'building' | 'checking' | 'working' | 'wrapping_up';
  update: string | null;
  updatedAt: string | null;
}
export const emptySnapshot = (): TextSnapshot => ({ text: '', truncated: false, updatedAt: null });
export const plainText = (value: unknown) => String(value).replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');

export async function resolveRunDirectory(root: string, id: string, area: 'control' | 'project') {
  if (!RUN_ID.test(id)) throw new Error('Invalid local task identity');
  const realRoot = await fs.realpath(root);
  const runDir = path.join(realRoot, id);
  const directory = path.join(runDir, area);
  for (const entry of [runDir, directory]) {
    const stat = await fs.lstat(entry);
    if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(entry) !== entry) throw new Error('Local task folder is not available');
  }
  return directory;
}

/** Only fixed, run-local files are exposed; generated symlinks and devices are never read. */
export async function readRunFile(root: string, id: string, area: 'control' | 'project', filename: string, maxBytes: number, tail = false): Promise<TextSnapshot | null> {
  if (!RUN_ID.test(id) || path.basename(filename) !== filename) return null;
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
  try {
    const directory = await resolveRunDirectory(root, id, area);
    // NONBLOCK also prevents a generated FIFO from holding the companion open.
    handle = await fs.open(path.join(directory, filename), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const stat = await handle.stat();
    if (!stat.isFile()) return null;
    const length = Math.min(stat.size, maxBytes);
    const buffer = Buffer.alloc(length);
    const offset = tail ? Math.max(0, stat.size - length) : 0;
    const { bytesRead } = await handle.read(buffer, 0, length, offset);
    let text = buffer.subarray(0, bytesRead).toString('utf8');
    // A tail can start inside a JSON line or UTF-8 character; drop that partial line.
    if (tail && offset > 0) text = text.includes('\n') ? text.slice(text.indexOf('\n') + 1) : '';
    return { text, truncated: stat.size > maxBytes, updatedAt: stat.mtime.toISOString() };
  } catch { return null; }
  finally { await handle?.close(); }
}

export async function writeAtomicJson(filename: string, value: unknown) {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
    await fs.rename(temporary, filename);
  } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
}

function readableEvents(snapshot: TextSnapshot): TextSnapshot {
  const lines: string[] = [];
  for (const line of snapshot.text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      const item = event.item;
      if (event.type === 'item.started' && item?.type === 'command_execution') lines.push(`$ ${plainText(item.command).slice(0, 2000)}`);
      if (event.type === 'item.completed' && item?.type === 'command_execution') lines.push(`${plainText(item.aggregated_output || '').slice(-8000)}\n[Command exit: ${item.exit_code ?? 'unknown'}]`);
      if (event.type === 'item.completed' && item?.type === 'agent_message') lines.push(plainText(item.text).slice(-8000));
      if (event.type === 'error' || event.type === 'turn.failed') lines.push(`Error: ${plainText(event.message || event.error?.message || 'Codex reported an execution error').slice(0, 2000)}`);
      if (event.type === 'turn.completed') lines.push('[Agent finished. Review its report and actual output.]');
    } catch { /* Partial or non-event output is not rendered as an instruction. */ }
  }
  const text = lines.join('\n\n');
  return { ...snapshot, text: text.slice(-24_000), truncated: snapshot.truncated || text.length > 24_000 };
}

/** A progress label describes the current event, never the success of the task. */
export function taskProgress(snapshot: TextSnapshot): TaskProgress {
  const progress: TaskProgress = { phase: 'starting', update: null, updatedAt: snapshot.updatedAt };
  for (const line of snapshot.text.split('\n')) {
    try {
      const event = JSON.parse(line);
      const item = event.item;
      if (event.type === 'turn.started') progress.phase = 'reading';
      if (event.type === 'item.started' && item?.type === 'command_execution') {
        const command = typeof item.command === 'string' ? item.command : '';
        progress.phase = /\b(?:pytest|unittest|vitest|playwright|test|lint|typecheck|tsc)\b/.test(command) ? 'checking'
          : /\b(?:install|add|build)\b/.test(command) ? 'building'
          : /\b(?:cat|head|sed|rg|ls|find|pwd)\b/.test(command) ? 'reading' : 'working';
      }
      if (event.type === 'item.started' && item?.type === 'file_change') progress.phase = 'building';
      if (event.type === 'item.completed' && item?.type === 'command_execution') progress.phase = 'working';
      if (event.type === 'item.completed' && item?.type === 'agent_message' && typeof item.text === 'string') {
        // Keep code, paths and long explanations in the expandable activity log.
        const paragraph = plainText(item.text).split(/\n\s*\n/)[0].replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*_#]/g, '').replace(/\s+/g, ' ').trim();
        progress.update = paragraph.length > 240 ? `${paragraph.slice(0, 237).replace(/\s+\S*$/, '')}…` : paragraph || null;
      }
      if (event.type === 'turn.completed') progress.phase = 'wrapping_up';
    } catch { /* A partial event is not a new progress signal. */ }
  }
  return progress;
}

export async function readRunOutput(root: string, state: { id: string; workspace: string; executor?: string; terminalMode?: string }) {
  const browser = state.executor === 'browser' || state.executor === 'computer';
  const resultName = state.executor === 'computer' ? 'COMPUTER-RESULT.json' : browser ? 'BROWSER-RESULT.json' : 'CONTEXTDROP-RESULT.md';
  const [events, stderr, report, lastMessage, browserHistory] = await Promise.all([
    readRunFile(root, state.id, 'control', 'codex-events.jsonl', 64 * 1024, true),
    readRunFile(root, state.id, 'control', 'codex-stderr.log', 8 * 1024, true),
    readRunFile(root, state.id, 'project', resultName, 32 * 1024),
    browser ? null : readRunFile(root, state.id, 'control', 'last-message.md', 32 * 1024),
    browser ? readRunFile(root, state.id, 'control', `${state.executor}-state.json`, 64 * 1024) : null,
  ]);
  const progress = taskProgress(events || emptySnapshot());
  let log = readableEvents(events || emptySnapshot());
  if (browserHistory && !browserHistory.truncated) {
    try {
      const saved = JSON.parse(browserHistory.text);
      const entries = Array.isArray(saved.history) ? saved.history.filter((item: unknown): item is { action: string; status: string } => Boolean(item && typeof item === 'object' && typeof (item as { action?: unknown }).action === 'string' && typeof (item as { status?: unknown }).status === 'string')) : [];
      const text = entries.map((item: { action: string; status: string }) => `[${plainText(item.status)}] ${plainText(item.action)}`).join('\n');
      log = { text: text.slice(-24_000), truncated: text.length > 24_000, updatedAt: browserHistory.updatedAt };
    } catch { /* The persisted browser history is not a valid completed snapshot. */ }
  }
  if (stderr?.text) log.text += `\n\n[CLI diagnostics]\n${plainText(stderr.text)}`;
  log.truncated ||= Boolean(stderr?.truncated);
  log.updatedAt = [log.updatedAt, stderr?.updatedAt].filter((value): value is string => Boolean(value)).sort().at(-1) || null;
  const result = report || lastMessage;
  return {
    id: state.id,
    mode: browser ? state.executor : state.terminalMode === 'exec' ? 'streaming' : 'interactive',
    progress,
    log,
    result: {
      text: result ? plainText(result.text) : '',
      path: report ? path.join(state.workspace, resultName) : lastMessage ? path.join(root, state.id, 'control', 'last-message.md') : null,
      source: report ? 'report' : lastMessage ? 'last_message' : null,
      verification: 'unverified',
      truncated: result?.truncated || false,
    },
  };
}
