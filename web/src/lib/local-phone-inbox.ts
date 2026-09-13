import { constants, promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { jwtVerify } from "jose";
import { BOT_USERNAME } from "./constants";
import { publicLink } from "./content-conversation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DASHBOARD_HOSTS = new Set(["contextdrop.app", "www.contextdrop.app", "contextdrop.ai", "www.contextdrop.ai", "context.drop.ai"]);
const PAGE_SIZE = 10;
const MAX_RESPONSE_BYTES = 8_000_000;
const STATE_FILE = "phone-inbox.json";
export class PhoneInboxError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}
export interface PhoneInboxOptions { root: string; env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch; now?: () => Date }
interface Cursor { updatedAt: string; id: string }
interface PhoneState {
  version: 1;
  owner: { userId: string; telegramId: number };
  pairedAt: string;
  cursor: Cursor | null;
  importedTotal: number;
  newCount: number;
  pendingCount: number | null;
  failedCount: number | null;
  hasMore: boolean;
  lastSyncedAt: string | null;
  lastReceivedAt: string | null;
  lastCompletedAt: string | null;
  lastError: string | null;
}
type RemoteRow = Record<string, unknown>;
const now = (options: PhoneInboxOptions) => (options.now?.() ?? new Date());
const validTime = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const preciseTime = (value: string) => new Date(value).toISOString().slice(0, 19) + "." + (value.match(/\.(\d+)/)?.[1] ?? "").padEnd(9, "0");
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

async function readPrivateJson(filename: string, limit: number): Promise<unknown> {
  let handle;
  try {
    handle = await fs.open(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > limit) throw new Error("Invalid local file");
    const bytes = await handle.readFile();
    if (bytes.length > limit) throw new Error("Invalid local file");
    return JSON.parse(bytes.toString("utf8"));
  } finally { await handle?.close(); }
}
async function atomicJson(filename: string, value: unknown) {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: "wx" });
    await fs.rename(temporary, filename);
  } finally { await fs.rm(temporary, { force: true }); }
}
async function stateFor(options: PhoneInboxOptions): Promise<PhoneState | null> {
  let value: unknown;
  try { value = await readPrivateJson(path.join(options.root, STATE_FILE), 16_000); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new PhoneInboxError("Phone pairing could not be read. Your saved file was preserved. Reconnect Telegram to repair it.", 409);
  }
  const state = value as PhoneState;
  if (state?.version !== 1 || !UUID.test(state.owner?.userId ?? "") || !Number.isSafeInteger(state.owner?.telegramId) || state.owner.telegramId <= 0 ||
      !Number.isSafeInteger(state.importedTotal) || state.importedTotal < 0 || !validTime(state.pairedAt) ||
      (state.cursor !== null && (!UUID.test(state.cursor?.id ?? "") || !validTime(state.cursor?.updatedAt)))) throw new PhoneInboxError("Phone pairing is invalid. Your saved file was preserved. Reconnect Telegram.", 409);
  return state;
}
async function saveState(options: PhoneInboxOptions, state: PhoneState) { await atomicJson(path.join(options.root, STATE_FILE), state); }

/** Serializes connect, disconnect and sync across the route and background worker. */
async function locked<T>(options: PhoneInboxOptions, work: () => Promise<T>): Promise<T> {
  await fs.mkdir(options.root, { recursive: true, mode: 0o700 });
  const filename = path.join(options.root, "phone-sync.lock");
  const nonce = randomUUID();
  let handle;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { handle = await fs.open(filename, "wx", 0o600); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const prior = record(await readPrivateJson(filename, 2000));
        if (!Number.isSafeInteger(prior.pid) || Number(prior.pid) < 1) throw new Error();
        try { process.kill(Number(prior.pid), 0); }
        catch (failure) { if ((failure as NodeJS.ErrnoException).code === "ESRCH") { await fs.unlink(filename); continue; } }
      } catch { /* Unreadable state never authorizes deleting a possibly active lock. */ }
      throw new PhoneInboxError("Phone inbox is already syncing. Try again in a moment.", 409);
    }
  }
  if (!handle) throw new PhoneInboxError("Phone inbox is already syncing.", 409);
  try { await handle.writeFile(JSON.stringify({ pid: process.pid, nonce })); }
  finally { await handle.close(); }
  try { return await work(); }
  finally {
    try { if (record(await readPrivateJson(filename, 2000)).nonce === nonce) await fs.unlink(filename); } catch { /* Preserve a newer lock. */ }
  }
}

function database(options: PhoneInboxOptions) {
  const env = options.env ?? process.env;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) throw new PhoneInboxError("Phone inbox needs the project's database connection. Your saved content is unchanged.", 503);
  let url: URL;
  try { url = new URL(env.SUPABASE_URL); } catch { throw new PhoneInboxError("The database connection is not configured correctly.", 503); }
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new PhoneInboxError("The database connection must use HTTPS.", 503);
  return { origin: url.origin, key: env.SUPABASE_SERVICE_KEY };
}

/** Fixed database origin from local configuration; every request is GET or HEAD. */
async function dbRead(options: PhoneInboxOptions, table: "users" | "analyses", query: Record<string, string>, head = false): Promise<{ rows: RemoteRow[]; count?: number }> {
  const { origin, key } = database(options);
  if (table === "analyses" && (!query.user_id?.startsWith("eq.") || !UUID.test(query.user_id.slice(3)) || query.source !== "eq.telegram")) throw new PhoneInboxError("The phone inbox owner could not be verified.", 401);
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`${origin}/rest/v1/${table}?${new URLSearchParams(query)}`, {
      method: head ? "HEAD" : "GET", redirect: "error", credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json", ...(head ? { Prefer: "count=exact" } : {}) },
    });
  } catch { throw new PhoneInboxError("Phone inbox could not reach the saved-content service. It will retry while this app is running."); }
  if (!response.ok) { await response.body?.cancel(); throw new PhoneInboxError("Phone inbox could not read the saved content. Check the connection and try again."); }
  if (head) {
    const count = Number(response.headers.get("content-range")?.match(/\/(\d+)$/)?.[1]);
    if (!Number.isSafeInteger(count) || count < 0) throw new PhoneInboxError("Phone inbox could not read its pending status.");
    return { rows: [], count };
  }
  if (Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES) { await response.body?.cancel(); throw new PhoneInboxError("This inbox batch was too large. No unread items were skipped."); }
  const reader = response.body?.getReader();
  if (!reader) throw new PhoneInboxError("Phone inbox returned an empty response.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new PhoneInboxError("This inbox batch was too large. No unread items were skipped."); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  try {
    const rows = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== "object" || Array.isArray(row))) throw new Error();
    return { rows };
  } catch { throw new PhoneInboxError("Phone inbox returned unreadable content. No unread items were skipped."); }
}

export async function connectPhoneInbox(options: PhoneInboxOptions, dashboardLink: unknown) {
  const env = options.env ?? process.env;
  if (!env.JWT_SECRET) throw new PhoneInboxError("The project's sign-in key is needed to connect Telegram.", 503);
  if (typeof dashboardLink !== "string" || dashboardLink.length > 8192) throw new PhoneInboxError("Paste your personal /dashboard link from the bot.", 400);
  let link: URL;
  try { link = new URL(dashboardLink.trim()); } catch { throw new PhoneInboxError("Paste your personal /dashboard link from the bot.", 400); }
  if (link.protocol !== "https:" || !DASHBOARD_HOSTS.has(link.hostname) || link.username || link.password || link.port || link.pathname !== "/auth" || link.searchParams.getAll("token").length !== 1) throw new PhoneInboxError("Use the personal ContextDrop dashboard link sent by the bot.", 400);
  let owner: PhoneState["owner"];
  try {
    const { payload } = await jwtVerify(link.searchParams.get("token")!, new TextEncoder().encode(env.JWT_SECRET), { algorithms: ["HS256"], currentDate: now(options) });
    const audiences = payload.aud === undefined ? [] : Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    // Existing bot links have no audience claim. If present, it must name this
    // exact dashboard origin; accepting arbitrary audiences would cross contexts.
    if (audiences.some(audience => audience !== link.origin) || !UUID.test(payload.sub ?? "") || !Number.isSafeInteger(payload.tid) || Number(payload.tid) <= 0 ||
        typeof payload.exp !== "number" || !Number.isFinite(payload.exp) || payload.exp <= now(options).getTime() / 1000) throw new Error();
    owner = { userId: payload.sub!, telegramId: Number(payload.tid) };
  } catch { throw new PhoneInboxError("That dashboard link is invalid or expired. Send /dashboard to the bot for a new one.", 401); }
  return locked(options, async () => {
    const { rows } = await dbRead(options, "users", { select: "id,telegram_id", id: `eq.${owner.userId}`, telegram_id: `eq.${owner.telegramId}`, limit: "2" });
    if (rows.length !== 1 || rows[0].id !== owner.userId || Number(rows[0].telegram_id) !== owner.telegramId) throw new PhoneInboxError("The dashboard link did not match a Telegram account. Nothing was imported.", 401);
    let previous: PhoneState | null = null;
    try { previous = await stateFor(options); } catch { /* Explicit authenticated reconnect can repair pairing, not source files. */ }
    if (previous?.owner.userId === owner.userId && previous.owner.telegramId === owner.telegramId) return getPhoneInboxStatus(options);
    const state: PhoneState = { version: 1, owner, pairedAt: now(options).toISOString(), cursor: null, importedTotal: 0, newCount: 0, pendingCount: null, failedCount: null, hasMore: false, lastSyncedAt: null, lastReceivedAt: null, lastCompletedAt: null, lastError: null };
    await saveState(options, state);
    return getPhoneInboxStatus(options);
  });
}

const shortText = (value: unknown, maximum: number): string | null => typeof value === "string" ? value.slice(0, maximum) : null;
function cleanObservations(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 240).flatMap(raw => {
    if (typeof raw === "string") return [{ description: raw.slice(0, 5000) }];
    const item = record(raw);
    if (typeof item.description !== "string") return [];
    const result: Record<string, unknown> = { description: item.description.slice(0, 5000), uncertain: item.uncertain === true };
    if (typeof item.timestampSec === "number" && Number.isFinite(item.timestampSec) && item.timestampSec >= 0) result.timestampSec = item.timestampSec;
    for (const key of ["onScreenText", "tools", "urls"]) if (Array.isArray(item[key])) result[key] = item[key].filter((entry: unknown) => typeof entry === "string").slice(0, 24).map((entry: string) => entry.slice(0, 2000));
    if (typeof item.speech === "string") result.speech = item.speech.slice(0, 4000);
    return [result];
  });
}

/** Remote local_evidence, paths, commands and executable metadata are never trusted. */
export function phoneSource(row: RemoteRow, ownerId: string, importedAt: string) {
  if (row.user_id !== ownerId || row.source !== "telegram" || row.status !== "done" || typeof row.id !== "string" || !UUID.test(row.id) || !validTime(row.updated_at) || !validTime(row.created_at)) throw new PhoneInboxError("A phone item could not be verified. It was not imported or skipped.");
  const sourceUrl = publicLink(row.source_url);
  if (!sourceUrl) throw new PhoneInboxError("A phone item has an unsupported source URL. It was not imported or skipped.");
  const metadata = record(row.metadata);
  const priorEvidence = record(metadata.source_evidence);
  const warnings = ["Imported from your Telegram analysis. This Mac has the saved text and observations, not the original media files or screenshots. Coverage reflects that earlier analysis, not a fresh reading."];
  if (Array.isArray(priorEvidence.warnings)) warnings.push(...priorEvidence.warnings.filter((value: unknown) => typeof value === "string").slice(0, 12).map((value: string) => value.slice(0, 1000)));
  const observations = cleanObservations(row.frame_descriptions);
  if (Array.isArray(row.frame_descriptions) && row.frame_descriptions.length > observations.length) warnings.push("Some original observations were omitted from this bounded local import.");
  const text = shortText(row.transcript, 300_000), caption = shortText(row.caption, 100_000), visual = shortText(row.visual_summary, 100_000);
  if (!text?.trim() && !caption?.trim() && !visual?.trim() && !observations.length) throw new PhoneInboxError("A completed phone item has no readable evidence. It was not imported or skipped.");
  if ((typeof row.transcript === "string" && row.transcript.length > 300_000) || (typeof row.caption === "string" && row.caption.length > 100_000) || (typeof row.visual_summary === "string" && row.visual_summary.length > 100_000)) warnings.push("Long text was shortened for this local import; the cloud analysis retains the original.");
  const mediaKind = typeof priorEvidence.media_kind === "string" && ["video", "article", "repository", "image", "audio", "document"].includes(priorEvidence.media_kind) ? priorEvidence.media_kind : observations.length ? "video" : "article";
  return {
    id: `phone-${row.id}`, user_id: ownerId, source_url: sourceUrl, platform: typeof row.platform === "string" ? row.platform.slice(0, 40) : "web", status: "done",
    transcript: text, caption, visual_summary: visual, frame_descriptions: observations, verdict: shortText(row.verdict, 30_000), verdict_intent: null, action_items: null, error_message: null, credits_charged: 0,
    created_at: row.created_at, completed_at: validTime(row.completed_at) ? row.completed_at : row.updated_at,
    metadata: {
      title: shortText(metadata.title, 300) || caption?.slice(0, 120) || "From Telegram", duration: typeof metadata.duration === "number" && Number.isFinite(metadata.duration) && metadata.duration > 0 ? metadata.duration : undefined,
      authorName: shortText(metadata.authorName, 200), authorUsername: shortText(metadata.authorUsername, 200), userNote: shortText(metadata.userNote, 2000),
      phone_import: { version: 1, analysisId: row.id, ownerId, importedAt, cloudUpdatedAt: row.updated_at },
      source_evidence: { version: 1, media_kind: mediaKind, provider: "telegram_cloud_import", capture_complete: priorEvidence.capture_complete === true, warnings,
        transcript: { status: text?.trim() ? "available" : "unavailable", timing: "untimed", characters: text?.length ?? 0 },
        visuals: { status: observations.length ? "imported_observations" : "unavailable", extracted_frames: 0, analyzed_frames: observations.length, observation_type: "imported_model_observations" } },
      local_evidence: { framePaths: [], timestampsSec: [], sourceUrl, capturedAt: importedAt },
    },
  };
}

async function importSource(options: PhoneInboxOptions, source: ReturnType<typeof phoneSource>) {
  const serialized = JSON.stringify(source);
  if (Buffer.byteLength(serialized, "utf8") > 4_000_000) throw new PhoneInboxError("This phone item is too large for the local library. It was not imported or skipped; its cloud copy is unchanged.");
  const directory = path.join(options.root, "library");
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  if (await fs.realpath(directory) !== path.join(await fs.realpath(options.root), "library")) throw new PhoneInboxError("The local library directory is invalid. No phone item was imported.", 409);
  const filename = path.join(directory, `${source.id}.json`);
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, serialized, { mode: 0o600, flag: "wx" });
    try { await fs.link(temporary, filename); return true; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = record(await readPrivateJson(filename, 4_000_000));
      const imported = record(record(existing.metadata).phone_import);
      if (existing.id !== source.id || existing.source_url !== source.source_url || imported.analysisId !== source.metadata.phone_import.analysisId || imported.ownerId !== source.user_id) throw new PhoneInboxError("A saved source conflicts with this phone item. The existing file was preserved.", 409);
      return false;
    }
  } finally { await fs.rm(temporary, { force: true }); }
}

export async function syncPhoneInbox(options: PhoneInboxOptions) {
  return locked(options, async () => {
    const state = await stateFor(options);
    if (!state) return getPhoneInboxStatus(options);
    try {
      const scope = { user_id: `eq.${state.owner.userId}`, source: "eq.telegram" };
      const query: Record<string, string> = { ...scope, select: "id,user_id,source,source_url,platform,status,transcript,frame_descriptions,visual_summary,caption,metadata,verdict,created_at,updated_at,completed_at", status: "eq.done", order: "updated_at.asc,id.asc", limit: String(PAGE_SIZE) };
      if (state.cursor) query.or = `(updated_at.gt.${state.cursor.updatedAt},and(updated_at.eq.${state.cursor.updatedAt},id.gt.${state.cursor.id}))`;
      const [completed, pending, failed, latestReceived, latestCompleted] = await Promise.all([
        dbRead(options, "analyses", query),
        dbRead(options, "analyses", { ...scope, select: "id", status: "in.(pending,scraping,transcribing,analyzing,generating)" }, true),
        dbRead(options, "analyses", { ...scope, select: "id", status: "eq.failed" }, true),
        dbRead(options, "analyses", { ...scope, select: "created_at", order: "created_at.desc", limit: "1" }),
        dbRead(options, "analyses", { ...scope, select: "completed_at", status: "eq.done", order: "completed_at.desc", limit: "1" }),
      ]);
      if (completed.rows.length > PAGE_SIZE) throw new PhoneInboxError("Phone inbox returned an oversized batch. No unread items were skipped.");
      state.newCount = 0; state.pendingCount = pending.count!; state.failedCount = failed.count!;
      state.lastReceivedAt = validTime(latestReceived.rows[0]?.created_at) ? latestReceived.rows[0].created_at : null;
      state.lastCompletedAt = validTime(latestCompleted.rows[0]?.completed_at) ? latestCompleted.rows[0].completed_at : null;
      for (const row of completed.rows) {
        const source = phoneSource(row, state.owner.userId, now(options).toISOString());
        const cursor = { updatedAt: row.updated_at as string, id: row.id as string };
        if (state.cursor && (preciseTime(cursor.updatedAt) < preciseTime(state.cursor.updatedAt) || (preciseTime(cursor.updatedAt) === preciseTime(state.cursor.updatedAt) && cursor.id <= state.cursor.id))) throw new PhoneInboxError("Phone inbox order changed. No unread item was skipped.");
        if (await importSource(options, source)) { state.newCount++; state.importedTotal++; }
        state.cursor = cursor;
        // Persist after each completed local write. A crash rechecks the same file
        // without overwriting it; a failed item never advances the cursor past it.
        await saveState(options, state);
      }
      state.hasMore = completed.rows.length === PAGE_SIZE;
      state.lastSyncedAt = now(options).toISOString(); state.lastError = null;
      await saveState(options, state);
    } catch (error) {
      state.lastError = error instanceof PhoneInboxError ? error.message : "Phone inbox could not save this batch. Your sources are preserved and unread items will retry.";
      await saveState(options, state);
      throw new PhoneInboxError(state.lastError, error instanceof PhoneInboxError ? error.status : 502);
    }
    return getPhoneInboxStatus(options);
  });
}

export async function disconnectPhoneInbox(options: PhoneInboxOptions) {
  return locked(options, async () => {
    await fs.rm(path.join(options.root, STATE_FILE), { force: true });
    return getPhoneInboxStatus(options);
  });
}

export async function phoneWorkerHeartbeat(root: string) {
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  await atomicJson(path.join(root, "phone-worker.json"), { pid: process.pid, seenAt: new Date().toISOString() });
}
export async function getPhoneInboxStatus(options: PhoneInboxOptions) {
  let state: PhoneState | null = null; let lastError: string | null = null;
  try { state = await stateFor(options); } catch (error) { lastError = error instanceof PhoneInboxError ? error.message : "Phone pairing could not be read."; }
  let workerOnline = false; let workerLastSeenAt: string | null = null;
  try {
    const worker = record(await readPrivateJson(path.join(options.root, "phone-worker.json"), 2000));
    if (Number.isSafeInteger(worker.pid) && Number(worker.pid) > 0 && validTime(worker.seenAt)) {
      workerLastSeenAt = worker.seenAt;
      process.kill(Number(worker.pid), 0);
      workerOnline = now(options).getTime() - Date.parse(worker.seenAt) >= 0 && now(options).getTime() - Date.parse(worker.seenAt) < 45_000;
    }
  } catch { /* No supervised background worker. Manual sync is still available. */ }
  const env = options.env ?? process.env;
  return { paired: !!state, configured: !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY && env.JWT_SECRET), botUsername: BOT_USERNAME, workerOnline, workerLastSeenAt,
    newCount: state?.newCount ?? 0, importedTotal: state?.importedTotal ?? 0, pendingCount: state?.pendingCount ?? null, failedCount: state?.failedCount ?? null, hasMore: state?.hasMore ?? false,
    lastSyncedAt: state?.lastSyncedAt ?? null, lastReceivedAt: state?.lastReceivedAt ?? null, lastCompletedAt: state?.lastCompletedAt ?? null, lastError: lastError ?? state?.lastError ?? null };
}
