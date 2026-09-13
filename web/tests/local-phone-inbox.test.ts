import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { SignJWT } from "jose";
import { connectPhoneInbox, disconnectPhoneInbox, getPhoneInboxStatus, phoneSource, syncPhoneInbox, type PhoneInboxOptions } from "../src/lib/local-phone-inbox";
import { activateLocalSource, frameSourceMatches, listLocalLibrary, readLocalLibrarySource, requestedLibraryId } from "../src/lib/local-library";

const USER = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const ITEM = "cccccccc-cccc-4ccc-cccc-cccccccccccc";
const NEXT = "dddddddd-dddd-4ddd-dddd-dddddddddddd";
const DATE = "2026-09-13T12:00:00.000Z";
const env = { NODE_ENV: "development" as const, SUPABASE_URL: "https://fixture.supabase.co", SUPABASE_SERVICE_KEY: "fixture-database-key", JWT_SECRET: "fixture-signing-secret-with-sufficient-length" };
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
const row = (overrides: Record<string, unknown> = {}) => ({ id: ITEM, user_id: USER, source: "telegram", source_url: "https://www.youtube.com/watch?v=QhmhUgccaS0", platform: "youtube", status: "done", transcript: "The creator explains a useful tool.", frame_descriptions: [{ timestampSec: 12, description: "A repository page", onScreenText: ["example/tool"], uncertain: true }], caption: "Caption", visual_summary: "A software tutorial", metadata: { title: "A useful tool", duration: 50, source_evidence: { media_kind: "video", capture_complete: true } }, created_at: DATE, updated_at: DATE, completed_at: DATE, ...overrides });
async function dashboard(payload: Record<string, unknown> = {}, expires: number | null = Math.floor(Date.parse(DATE) / 1000) + 3600) {
  let jwt = new SignJWT({ sub: USER, tid: 12345, username: "fixture", ...payload }).setProtectedHeader({ alg: "HS256" });
  if (expires !== null) jwt = jwt.setExpirationTime(expires);
  return "https://contextdrop.app/auth?token=" + await jwt.sign(new TextEncoder().encode(env.JWT_SECRET));
}
async function sandbox(work: (options: PhoneInboxOptions) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-phone-"));
  try { await work({ root, env, now: () => new Date(DATE) }); }
  finally { await fs.rm(root, { recursive: true, force: true }); }
}
function database(rows: Record<string, unknown>[], calls: URL[] = []): typeof fetch {
  return (async (input, init) => {
    const url = new URL(String(input)); calls.push(url);
    assert.equal(url.origin, env.SUPABASE_URL);
    assert.ok(["GET", "HEAD"].includes(init!.method!));
    if (url.pathname.endsWith("/users")) { assert.equal(url.searchParams.get("id"), `eq.${USER}`); assert.equal(url.searchParams.get("telegram_id"), "eq.12345"); return json([{ id: USER, telegram_id: 12345 }]); }
    assert.equal(url.searchParams.get("user_id"), `eq.${USER}`);
    assert.equal(url.searchParams.get("source"), "eq.telegram");
    if (init!.method === "HEAD") return new Response(null, { headers: { "Content-Range": `*/${url.searchParams.get("status") === "eq.failed" ? 2 : 1}` } });
    if (url.searchParams.get("select") === "created_at") return json([{ created_at: DATE }]);
    if (url.searchParams.get("select") === "completed_at") return json([{ completed_at: DATE }]);
    assert.equal(url.searchParams.get("status"), "eq.done");
    return json(rows);
  }) as typeof fetch;
}

test("signed dashboard pairing stores only verified owner identity and exposes no credentials", () => sandbox(async options => {
  options.fetchImpl = database([]);
  const link = await dashboard();
  const status = await connectPhoneInbox(options, link);
  assert.equal(status.paired, true);
  assert.equal(status.botUsername, "contextdrop2027bot");
  const stored = await fs.readFile(path.join(options.root, "phone-inbox.json"), "utf8");
  assert.equal(stored.includes(new URL(link).searchParams.get("token")!), false);
  assert.equal(stored.includes(env.JWT_SECRET), false);
  assert.equal(stored.includes(env.SUPABASE_SERVICE_KEY), false);
  assert.equal(JSON.stringify(status).includes(USER), false);
  assert.equal(JSON.stringify(status).includes("12345"), false);
  assert.equal((await fs.stat(path.join(options.root, "phone-inbox.json"))).mode & 0o777, 0o600);
}));

test("pairing rejects lookalike hosts, expired or missing expiration, foreign audience and owner mismatch", () => sandbox(async options => {
  let calls = 0; options.fetchImpl = (async () => { calls++; return json([]); }) as typeof fetch;
  const good = await dashboard();
  for (const link of [good.replace("contextdrop.app", "contextdrop.app.evil.test"), good.replace("https:", "http:"), await dashboard({}, 1), await dashboard({}, null), await dashboard({ aud: "another-app" }), await dashboard({ sub: "local" }), await dashboard({ tid: "12345" })]) await assert.rejects(connectPhoneInbox(options, link));
  assert.equal(calls, 0);
  await assert.rejects(connectPhoneInbox(options, good), /did not match/);
  assert.equal(calls, 1);
  assert.equal((await getPhoneInboxStatus(options)).paired, false);
}));

test("unpaired sync reads no database rows and never infers an owner from the active source", () => sandbox(async options => {
  await fs.writeFile(path.join(options.root, "local-analysis.json"), JSON.stringify(row({ user_id: "local" })));
  options.fetchImpl = (async () => { assert.fail("Must not query without a proven owner"); }) as typeof fetch;
  assert.equal((await syncPhoneInbox(options)).paired, false);
}));

test("owner-scoped sync imports evidence without active-source changes or executable metadata", () => sandbox(async options => {
  const calls: URL[] = [];
  const remote = row({ metadata: { title: "A useful tool", duration: 50, local_evidence: { framePaths: ["/Users/private/secret.jpg"] }, command: "open malicious", workspacePath: "/Users/private", source_evidence: { media_kind: "video", capture_complete: true, warnings: ["Sampled"] } }, frame_descriptions: [{ timestampSec: 12, description: "A repository page", framePath: "/private/file", command: "execute something", onScreenText: ["example/tool"] }] });
  options.fetchImpl = database([remote], calls);
  await connectPhoneInbox(options, await dashboard());
  await fs.writeFile(path.join(options.root, "local-analysis.json"), "active source to preserve");
  await fs.mkdir(path.join(options.root, "conversations"));
  await fs.writeFile(path.join(options.root, "conversations/current.json"), "conversation to preserve");
  const status = await syncPhoneInbox(options);
  assert.equal(status.newCount, 1); assert.equal(status.pendingCount, 1); assert.equal(status.failedCount, 2);
  assert.equal(status.lastReceivedAt, DATE); assert.equal(status.lastCompletedAt, DATE);
  const filename = path.join(options.root, "library", `phone-${ITEM}.json`);
  const saved = await fs.readFile(filename, "utf8");
  assert.equal(saved.includes("/Users/private"), false); assert.equal(saved.includes("/private/file"), false); assert.equal(saved.includes("open malicious"), false);
  const source = JSON.parse(saved);
  assert.equal(source.source_url, remote.source_url); assert.equal(source.transcript, remote.transcript);
  assert.deepEqual(source.metadata.local_evidence.framePaths, []);
  assert.match(source.metadata.source_evidence.warnings[0], /not the original media files/);
  assert.equal(await fs.readFile(path.join(options.root, "local-analysis.json"), "utf8"), "active source to preserve");
  assert.equal(await fs.readFile(path.join(options.root, "conversations/current.json"), "utf8"), "conversation to preserve");
  options.fetchImpl = database([], calls);
  await syncPhoneInbox(options);
  assert.ok(calls.some(url => url.searchParams.get("or")?.includes(`id.gt.${ITEM}`)));
  assert.equal(await fs.readFile(filename, "utf8"), saved);
}));

test("foreign, failed and malformed rows never import or advance the durable cursor", () => sandbox(async options => {
  options.fetchImpl = database([]); await connectPhoneInbox(options, await dashboard());
  for (const bad of [row({ user_id: OTHER }), row({ source: "web" }), row({ status: "failed" }), row({ source_url: "http://localhost/secret" }), row({ transcript: null, caption: null, visual_summary: null, frame_descriptions: [] })]) {
    options.fetchImpl = database([bad]);
    await assert.rejects(syncPhoneInbox(options));
    const state = JSON.parse(await fs.readFile(path.join(options.root, "phone-inbox.json"), "utf8"));
    assert.equal(state.cursor, null); assert.equal(state.importedTotal, 0); assert.ok(state.lastError);
  }
}));

test("a failed middle import preserves prior progress and retries that unread row", () => sandbox(async options => {
  options.fetchImpl = database([]); await connectPhoneInbox(options, await dashboard());
  const second = row({ id: NEXT, updated_at: "2026-09-13T12:00:01.000Z" });
  await fs.mkdir(path.join(options.root, "library"));
  const conflicting = path.join(options.root, "library", `phone-${NEXT}.json`);
  await fs.writeFile(conflicting, "unrelated data to preserve");
  options.fetchImpl = database([row(), second]);
  await assert.rejects(syncPhoneInbox(options));
  const state = JSON.parse(await fs.readFile(path.join(options.root, "phone-inbox.json"), "utf8"));
  assert.equal(state.cursor.id, ITEM); assert.equal(state.importedTotal, 1);
  assert.equal(await fs.readFile(conflicting, "utf8"), "unrelated data to preserve");
  await fs.unlink(conflicting);
  options.fetchImpl = database([second]);
  assert.equal((await syncPhoneInbox(options)).importedTotal, 2);
}));

test("replayed writes dedupe safely and microsecond timestamp ordering is preserved", () => sandbox(async options => {
  options.fetchImpl = database([]); await connectPhoneInbox(options, await dashboard());
  const first = row({ id: NEXT, updated_at: "2026-09-13T12:00:00.123456+00:00" });
  await fs.mkdir(path.join(options.root, "library"));
  await fs.writeFile(path.join(options.root, "library", `phone-${NEXT}.json`), JSON.stringify(phoneSource(first, USER, DATE)));
  options.fetchImpl = database([first, row({ updated_at: "2026-09-13T12:00:00.123457+00:00" })]);
  const status = await syncPhoneInbox(options);
  assert.equal(status.newCount, 1);
  const state = JSON.parse(await fs.readFile(path.join(options.root, "phone-inbox.json"), "utf8"));
  assert.equal(state.cursor.id, ITEM);
}));

test("disconnect removes pairing only and an active lock cannot be stolen", () => sandbox(async options => {
  options.fetchImpl = database([]); await connectPhoneInbox(options, await dashboard());
  await fs.mkdir(path.join(options.root, "library"));
  await fs.writeFile(path.join(options.root, "library/retained.json"), "retained source");
  const lock = path.join(options.root, "phone-sync.lock");
  await fs.writeFile(lock, JSON.stringify({ pid: process.pid, nonce: "another-operation" }));
  await assert.rejects(disconnectPhoneInbox(options), /already syncing/);
  assert.ok(await fs.stat(lock));
  await fs.unlink(lock);
  assert.equal((await disconnectPhoneInbox(options)).paired, false);
  assert.equal(await fs.readFile(path.join(options.root, "library/retained.json"), "utf8"), "retained source");
}));

test("phone source identities work in the real library and switch paths", () => sandbox(async options => {
  options.fetchImpl = database([row()]);
  await connectPhoneInbox(options, await dashboard());
  await fs.writeFile(path.join(options.root, "local-analysis.json"), JSON.stringify(row({ id: "local-source", source: undefined, source_url: "https://example.com/current" })));
  await syncPhoneInbox(options);
  const id = `phone-${ITEM}`;
  assert.equal(requestedLibraryId({ analysisId: id }), id);
  assert.equal(frameSourceMatches(new URLSearchParams({ analysisId: id }), id), true);
  assert.ok((await listLocalLibrary(options.root)).items.some(item => item.analysisId === id));
  assert.equal((await readLocalLibrarySource(options.root, id))?.source_url, row().source_url);
  await activateLocalSource(options.root, id);
  assert.equal(JSON.parse(await fs.readFile(path.join(options.root, "local-analysis.json"), "utf8")).id, id);
  assert.ok(await fs.stat(path.join(options.root, "library/local-source.json")));
}));

test("an oversized imported source cannot advance the cursor into an unreadable library file", () => sandbox(async options => {
  options.fetchImpl = database([]); await connectPhoneInbox(options, await dashboard());
  const observations = Array.from({ length: 240 }, (_, index) => ({ timestampSec: index, description: "Visible text", onScreenText: Array(12).fill("x".repeat(2000)) }));
  options.fetchImpl = database([row({ frame_descriptions: observations })]);
  await assert.rejects(syncPhoneInbox(options), /too large for the local library/);
  const state = JSON.parse(await fs.readFile(path.join(options.root, "phone-inbox.json"), "utf8"));
  assert.equal(state.cursor, null); assert.equal(state.importedTotal, 0);
  await assert.rejects(fs.stat(path.join(options.root, "library", `phone-${ITEM}.json`)), /ENOENT/);
}));
