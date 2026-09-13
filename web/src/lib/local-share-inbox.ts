import { constants, promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { publicLink } from "./content-conversation";

const MAX_FILE_BYTES = 20_000;
const MAX_STATE_BYTES = 2_000_000;
const MAX_FILES = 10_000;
const MAX_PER_SCAN = 100;
const MAX_PENDING = 200;
const MAX_SEEN = 10_000;
const ID = /^[a-f0-9]{64}$/;
export interface ShareInboxItem { id: string; url: string; receivedAt: string; source: "iphone" }
export interface ShareInboxStatus { available: boolean; shortcutAvailable: boolean; lastSyncedAt: string | null; items: ShareInboxItem[]; error?: string }
/** inboxPath is a trusted worker/test option, never accepted from an HTTP request. */
export interface ShareInboxOptions { root: string; inboxPath?: string; now?: () => Date }
interface InboxState { version: 1; lastSyncedAt: string | null; cursor: string; items: ShareInboxItem[]; seen: string[]; error?: string }
export class ShareInboxError extends Error { constructor(message: string, public status = 409) { super(message); } }
export const shareInboxPath = () => path.join(os.homedir(), "Library", "Mobile Documents", "iCloud~is~workflow~my~workflows", "Documents", "ContextDrop", "Inbox");
const inputPath = (options: ShareInboxOptions) => options.inboxPath ?? shareInboxPath();
const emptyState = (): InboxState => ({ version: 1, lastSyncedAt: null, cursor: "", items: [], seen: [] });
const timestamp = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));

export function canonicalInboxUrl(text: string): string | null {
  let value = text.trim();
  // Windows .url files are data too. Do not accept additional fields or commands.
  const shortcut = value.match(/^\[InternetShortcut\]\r?\nURL=([^\r\n]+)$/i);
  if (shortcut) value = shortcut[1];
  if (/[\s\\\u0000-\u001f\u007f]/u.test(value)) return null;
  const safe = publicLink(value);
  if (!safe) return null;
  const url = new URL(safe);
  // Reject dotted aliases of private names; DNS/redirect egress checks still belong to capture.
  url.hostname = url.hostname.replace(/\.+$/, "");
  if (!publicLink(url.href)) return null;
  for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key) || key === "fbclid" || (["igsh", "igshid", "stkn"].includes(key) && /(^|\.)instagram\.com$/.test(url.hostname))) url.searchParams.delete(key);
  return url.href;
}
const identity = (url: string) => createHash("sha256").update(url).digest("hex");

async function directoryWithoutLinks(filename: string, checkParent = false): Promise<string> {
  const stat = await fs.lstat(filename);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Unsafe inbox directory");
  if (checkParent) {
    const parent = await fs.lstat(path.dirname(filename));
    if (!parent.isDirectory() || parent.isSymbolicLink()) throw new Error("Unsafe inbox parent");
  }
  const canonical = await fs.realpath(filename);
  if (canonical !== path.join(await fs.realpath(path.dirname(filename)), path.basename(filename))) throw new Error("Unsafe inbox path");
  return canonical;
}
async function stateDirectory(options: ShareInboxOptions, create = false): Promise<string> {
  if (create) await fs.mkdir(options.root, { recursive: true, mode: 0o700 });
  const root = await directoryWithoutLinks(options.root);
  const directory = path.join(root, "inbox");
  if (create) await fs.mkdir(directory, { mode: 0o700 }).catch(error => { if (error.code !== "EEXIST") throw error; });
  return directoryWithoutLinks(directory);
}
async function boundedFile(filename: string, limit: number) {
  const handle = await fs.open(filename, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size > limit) throw new Error("Unsafe inbox file");
    const bytes = Buffer.alloc(limit + 1);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    const after = await handle.stat();
    if (bytesRead > limit || after.size !== before.size || after.mtimeMs !== before.mtimeMs || bytesRead !== before.size) throw new Error("Inbox file is changing");
    return { bytes: bytes.subarray(0, bytesRead), stat: after };
  } finally { await handle.close(); }
}
async function readState(options: ShareInboxOptions): Promise<InboxState> {
  let value: InboxState;
  try {
    const directory = await stateDirectory(options);
    value = JSON.parse((await boundedFile(path.join(directory, "queue.json"), MAX_STATE_BYTES)).bytes.toString("utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw new ShareInboxError("The local phone inbox could not be read. Its saved files were preserved.");
  }
  if (value?.version !== 1 || (value.lastSyncedAt !== null && !timestamp(value.lastSyncedAt)) || typeof value.cursor !== "string" || value.cursor.length > 1024 ||
      !Array.isArray(value.items) || value.items.length > MAX_PENDING || !Array.isArray(value.seen) || value.seen.length > MAX_SEEN ||
      value.seen.some(id => typeof id !== "string" || !ID.test(id)) || new Set(value.seen).size !== value.seen.length ||
      (value.error !== undefined && (typeof value.error !== "string" || value.error.length > 300))) throw new ShareInboxError("The local phone inbox is invalid. Its saved files were preserved.");
  const seen = new Set(value.seen);
  if (value.items.some(item => !item || item.source !== "iphone" || !ID.test(item.id) || !timestamp(item.receivedAt) || typeof item.url !== "string" || canonicalInboxUrl(item.url) !== item.url || identity(item.url) !== item.id || !seen.has(item.id)) || new Set(value.items.map(item => item.id)).size !== value.items.length) throw new ShareInboxError("The local phone inbox is invalid. Its saved files were preserved.");
  return value;
}
async function writeState(directory: string, state: InboxState) {
  const serialized = JSON.stringify(state);
  if (Buffer.byteLength(serialized) > MAX_STATE_BYTES) throw new ShareInboxError("The local phone inbox is full. Original shared files are unchanged.");
  const temporary = path.join(directory, `${randomUUID()}.tmp`);
  try {
    const handle = await fs.open(temporary, "wx", 0o600);
    try { await handle.writeFile(serialized); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(temporary, path.join(directory, "queue.json"));
  } finally { await fs.unlink(temporary).catch(() => {}); }
}

async function locked<T>(options: ShareInboxOptions, work: (directory: string) => Promise<T>) {
  const directory = await stateDirectory(options, true);
  const filename = path.join(directory, "sync.lock");
  const nonce = randomUUID();
  let handle;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { handle = await fs.open(filename, "wx", 0o600); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const prior = JSON.parse((await boundedFile(filename, 1000)).bytes.toString("utf8"));
        if (Number.isSafeInteger(prior.pid) && prior.pid > 0) {
          try { process.kill(prior.pid, 0); }
          catch (failure) { if ((failure as NodeJS.ErrnoException).code === "ESRCH") { await fs.unlink(filename); continue; } }
        }
      } catch { /* A malformed/live lock never grants permission to steal it. */ }
      throw new ShareInboxError("The phone inbox is already syncing. Try again shortly.");
    }
  }
  if (!handle) throw new ShareInboxError("The phone inbox is already syncing.");
  try { await handle.writeFile(JSON.stringify({ pid: process.pid, nonce })); } finally { await handle.close(); }
  try { return await work(directory); }
  finally {
    try { if (JSON.parse((await boundedFile(filename, 1000)).bytes.toString("utf8")).nonce === nonce) await fs.unlink(filename); } catch { /* Preserve an unfamiliar lock. */ }
  }
}

export async function getShareInboxStatus(options: ShareInboxOptions): Promise<ShareInboxStatus> {
  let available = false;
  let shortcutAvailable = false;
  try { await directoryWithoutLinks(inputPath(options), true); available = true; } catch { /* iCloud may not be available on this Mac yet. */ }
  try {
    const root = await directoryWithoutLinks(options.root);
    const stat = await fs.lstat(path.join(root, "Send-to-ContextDrop.shortcut"));
    shortcutAvailable = stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= 1_000_000;
  } catch { /* The optional shortcut has not been installed. */ }
  try {
    const state = await readState(options);
    const items = state.items.map(({ id, url, receivedAt }) => ({ id, url, receivedAt, source: "iphone" as const })).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    return { available, shortcutAvailable, lastSyncedAt: state.lastSyncedAt, items, ...(state.error ? { error: state.error } : {}) };
  } catch (error) { return { available, shortcutAvailable, lastSyncedAt: null, items: [], error: error instanceof ShareInboxError ? error.message : "The local phone inbox is unavailable. Original files are unchanged." }; }
}

/** Import only URL data; never fetch it or touch active capture, library, conversation or execution. */
export async function syncShareInbox(options: ShareInboxOptions): Promise<ShareInboxStatus> {
  await locked(options, async directory => {
    const state = await readState(options);
    let source: string;
    try { source = await directoryWithoutLinks(inputPath(options), true); }
    catch { state.error = "Waiting for the ContextDrop inbox folder in iCloud Drive on this Mac."; await writeState(directory, state); return; }
    const names: string[] = [];
    let oversizedDirectory = false;
    const entries = await fs.opendir(source);
    let count = 0;
    for await (const entry of entries) {
      if (++count > MAX_FILES) { oversizedDirectory = true; break; }
      if (!entry.name.startsWith(".") && /\.(txt|url)$/i.test(entry.name) && entry.isFile()) names.push(entry.name);
    }
    names.sort();
    // Rotate through preserved originals. A fixed first-100 slice would starve later shares.
    const after = names.filter(name => name > state.cursor);
    const candidates = [...after, ...names.filter(name => name <= state.cursor)].slice(0, MAX_PER_SCAN);
    const seen = new Set(state.seen);
    const now = options.now?.() ?? new Date();
    let invalid = false;
    let full = false;
    for (const name of candidates) {
      state.cursor = name;
      try {
        const { bytes, stat } = await boundedFile(path.join(source, name), MAX_FILE_BYTES);
        // Shortcuts/iCloud can still be writing a newly materialized file. Retry it next cycle.
        if (now.getTime() - stat.mtimeMs < 1500) continue;
        const url = canonicalInboxUrl(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
        if (!url) { invalid = true; continue; }
        const id = identity(url);
        if (seen.has(id)) continue;
        if (state.items.length >= MAX_PENDING || seen.size >= MAX_SEEN) { full = true; continue; }
        state.items.push({ id, url, receivedAt: now.toISOString(), source: "iphone" });
        seen.add(id);
      } catch { invalid = true; }
    }
    state.seen = [...seen];
    state.lastSyncedAt = now.toISOString();
    state.error = full ? "The phone inbox is full. Dismiss finished links to make room; unimported files remain in iCloud Drive." : oversizedDirectory ? "The shared folder contains too many files to scan fully. Move older originals out of Inbox; no files were deleted." : invalid ? "Some shared files are not small, complete HTTPS links. They were preserved and will retry after correction." : undefined;
    if (seen.size >= MAX_SEEN && full) state.error = "The phone inbox history is full. Unimported files remain in iCloud Drive; no saved history was discarded.";
    await writeState(directory, state);
  });
  return getShareInboxStatus(options);
}

export async function dismissShareInboxItem(options: ShareInboxOptions, id: string): Promise<ShareInboxStatus> {
  if (!ID.test(id)) throw new ShareInboxError("Choose a saved inbox link.", 400);
  await locked(options, async directory => {
    const state = await readState(options);
    if (!state.seen.includes(id)) throw new ShareInboxError("This inbox link was not found.", 404);
    state.items = state.items.filter(item => item.id !== id);
    // Keep the hash forever within the bounded history so preserved files cannot resurrect it.
    await writeState(directory, state);
  });
  return getShareInboxStatus(options);
}
