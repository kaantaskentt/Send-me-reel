import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { canonicalInboxUrl, dismissShareInboxItem, getShareInboxStatus, syncShareInbox } from "../src/lib/local-share-inbox";

async function fixture() {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-share-test-"));
  const root = path.join(base, "private");
  const inboxPath = path.join(base, "ContextDrop", "Inbox");
  await fs.mkdir(root); await fs.mkdir(inboxPath, { recursive: true });
  const now = () => new Date("2026-09-13T15:00:00.000Z");
  const options = { root, inboxPath, now };
  async function put(name: string, content: string | Buffer) {
    const filename = path.join(inboxPath, name);
    await fs.writeFile(filename, content);
    await fs.utimes(filename, new Date("2026-09-13T14:00:00Z"), new Date("2026-09-13T14:00:00Z"));
    return filename;
  }
  return { base, root, inboxPath, options, put, cleanup: () => fs.rm(base, { force: true, recursive: true }) };
}

test("shared URLs remain data and canonicalization preserves meaningful paths, timestamps and query parameters", () => {
  assert.equal(canonicalInboxUrl(" HTTPS://EXAMPLE.COM:443/tutorial?version=2&utm_source=phone#step-2\n"), "https://example.com/tutorial?version=2#step-2");
  assert.equal(canonicalInboxUrl("[InternetShortcut]\r\nURL=https://github.com/example/project"), "https://github.com/example/project");
  assert.equal(canonicalInboxUrl("https://www.instagram.com/reel/Dc7hhAUEvu1/?stkn=NTc4MTIwNjQ2YQ=="), "https://www.instagram.com/reel/Dc7hhAUEvu1/");
  assert.equal(canonicalInboxUrl("https://example.com/reel?stkn=meaningful"), "https://example.com/reel?stkn=meaningful");
  assert.notEqual(canonicalInboxUrl("https://youtube.com/watch?v=one&t=20"), canonicalInboxUrl("https://youtube.com/watch?v=two&t=20"));
  assert.notEqual(canonicalInboxUrl("https://youtube.com/watch?v=one&t=20"), canonicalInboxUrl("https://youtube.com/watch?v=one&t=30"));
  for (const value of ["https://user:pass@example.com", "http://example.com", "https://localhost.", "https://host.internal.", "https://192.168.1.1", "https://0x7f000001", "https://[::1]", "https://example.com:5000", "https://example.com\\@localhost", "https://example.com\nrun this", "https://example.com https://second.com", "file:///tmp/test", "javascript:alert(1)", "[InternetShortcut]\nURL=https://example.com\nCommand=run", "https://example.com/" + "x".repeat(2048)]) assert.equal(canonicalInboxUrl(value), null, value);
});

test("read-only status does not create a queue and reports a regular bounded signed shortcut only", async () => {
  const f = await fixture();
  try {
    assert.deepEqual(await getShareInboxStatus(f.options), { available: true, shortcutAvailable: false, lastSyncedAt: null, items: [] });
    await assert.rejects(fs.access(path.join(f.root, "inbox")));
    const shortcut = path.join(f.root, "Send-to-ContextDrop.shortcut");
    await fs.writeFile(shortcut, "fixture");
    assert.equal((await getShareInboxStatus(f.options)).shortcutAvailable, true);
    await fs.unlink(shortcut); await fs.symlink(path.join(f.inboxPath, "missing.txt"), shortcut);
    assert.equal((await getShareInboxStatus(f.options)).shortcutAvailable, false);
    await fs.unlink(shortcut); await fs.writeFile(shortcut, Buffer.alloc(1_000_001));
    assert.equal((await getShareInboxStatus(f.options)).shortcutAvailable, false);
  } finally { await f.cleanup(); }
});

test("sync deduplicates equivalent shares, preserves originals and active chat, never performs a network request", async () => {
  const f = await fixture();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("Unexpected network call"); };
  try {
    const active = '{"id":"current","status":"analyzing"}';
    const chat = '{"messages":[{"text":"unsent or active conversation"}]}';
    await fs.writeFile(path.join(f.root, "local-analysis.json"), active);
    await fs.writeFile(path.join(f.root, "conversation.json"), chat);
    await fs.mkdir(path.join(f.root, "library"));
    await f.put("first.txt", "https://www.instagram.com/reel/abc/?igsh=tracking");
    await f.put("second.txt", "https://www.instagram.com/reel/abc/");
    await f.put("third.url", "[InternetShortcut]\nURL=https://github.com/example/project");
    const result = await syncShareInbox(f.options);
    assert.equal(result.items.length, 2);
    assert.equal(result.lastSyncedAt, f.options.now().toISOString());
    assert.equal(result.error, undefined);
    assert.deepEqual(Object.keys(result.items[0]).sort(), ["id", "receivedAt", "source", "url"]);
    assert.equal(result.items[0].source, "iphone");
    assert.equal((await syncShareInbox(f.options)).items.length, 2);
    assert.equal(await fs.readFile(path.join(f.inboxPath, "first.txt"), "utf8"), "https://www.instagram.com/reel/abc/?igsh=tracking");
    assert.equal(await fs.readFile(path.join(f.root, "local-analysis.json"), "utf8"), active);
    assert.equal(await fs.readFile(path.join(f.root, "conversation.json"), "utf8"), chat);
    assert.deepEqual(await fs.readdir(path.join(f.root, "library")), []);
    assert.equal((await fs.stat(path.join(f.root, "inbox", "queue.json"))).mode & 0o777, 0o600);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; await f.cleanup(); }
});

test("dismissal is durable across fresh reads, re-shares and restart; unknown IDs and lock owners are preserved", async () => {
  const f = await fixture();
  try {
    await f.put("source.txt", "https://example.com/shared");
    const item = (await syncShareInbox(f.options)).items[0];
    assert.equal((await dismissShareInboxItem(f.options, item.id)).items.length, 0);
    await f.put("reshared.txt", "https://example.com/shared?utm_source=again");
    assert.equal((await syncShareInbox({ ...f.options })).items.length, 0);
    assert.equal((await getShareInboxStatus({ ...f.options })).items.length, 0);
    await assert.rejects(dismissShareInboxItem(f.options, "../queue"), error => (error as { status: number }).status === 400);
    await assert.rejects(dismissShareInboxItem(f.options, "f".repeat(64)), error => (error as { status: number }).status === 404);
    const lock = path.join(f.root, "inbox", "sync.lock");
    const finishedProcess = spawnSync(process.execPath, ["-e", ""]);
    assert.equal(finishedProcess.status, 0);
    await fs.writeFile(lock, JSON.stringify({ pid: finishedProcess.pid, nonce: "stopped-owner" }));
    assert.equal((await syncShareInbox(f.options)).items.length, 0);
    await assert.rejects(fs.access(lock));
    await fs.writeFile(lock, JSON.stringify({ pid: process.pid, nonce: "existing" }));
    await assert.rejects(syncShareInbox(f.options), /already syncing/);
    assert.equal(JSON.parse(await fs.readFile(lock, "utf8")).nonce, "existing");
  } finally { await f.cleanup(); }
});

test("bounded scanning rotates beyond preserved first files, reports a full queue and retries excess shares after dismissal", async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 201; i++) await f.put(`${String(i).padStart(3, "0")}.txt`, `https://example.com/item/${i}`);
    assert.equal((await syncShareInbox(f.options)).items.length, 100);
    assert.equal((await syncShareInbox(f.options)).items.length, 200);
    const full = await syncShareInbox(f.options);
    assert.equal(full.items.length, 200); assert.match(full.error ?? "", /full/);
    const excess = await fs.readFile(path.join(f.inboxPath, "200.txt"), "utf8");
    await dismissShareInboxItem(f.options, full.items[0].id);
    let status = await syncShareInbox(f.options);
    for (let i = 0; i < 3 && !status.items.some(item => item.url === excess); i++) status = await syncShareInbox(f.options);
    assert.ok(status.items.some(item => item.url === excess));
    assert.equal(status.items.length, 200);
    assert.equal((await fs.readdir(f.inboxPath)).length, 201);
  } finally { await f.cleanup(); }
});

test("incomplete, oversized, invalid UTF-8, symlink, nested and FIFO inputs never import and corrected files retry", async () => {
  const f = await fixture();
  try {
    await f.put("huge.txt", "https://example.com/" + "x".repeat(20_000));
    await f.put("invalid.txt", Buffer.from([0xff, 0xfe]));
    await f.put("partial.txt", "https://");
    const changing = await f.put("changing.txt", "https://example.com/later");
    await fs.utimes(changing, f.options.now(), f.options.now());
    const outside = path.join(f.base, "outside.txt"); await fs.writeFile(outside, "https://example.com/secret");
    await fs.symlink(outside, path.join(f.inboxPath, "link.txt"));
    await fs.mkdir(path.join(f.inboxPath, "nested")); await fs.writeFile(path.join(f.inboxPath, "nested", "hidden.txt"), "https://example.com/hidden");
    if (process.platform !== "win32") assert.equal(spawnSync("mkfifo", [path.join(f.inboxPath, "pipe.txt")]).status, 0);
    const result = await syncShareInbox(f.options);
    assert.equal(result.items.length, 0); assert.match(result.error ?? "", /complete HTTPS/);
    await f.put("partial.txt", "https://example.com/fixed");
    const retry = await syncShareInbox({ ...f.options, now: () => new Date("2026-09-13T15:00:03Z") });
    assert.deepEqual(retry.items.map(item => item.url).sort(), ["https://example.com/fixed", "https://example.com/later"]);
    assert.equal(await fs.readFile(outside, "utf8"), "https://example.com/secret");
  } finally { await f.cleanup(); }
});

test("corrupt state, symlinked queue storage and symlinked iCloud folder fail closed without overwriting originals", async () => {
  const f = await fixture();
  try {
    await f.put("source.txt", "https://example.com/shared");
    await syncShareInbox(f.options);
    const filename = path.join(f.root, "inbox", "queue.json");
    await fs.writeFile(filename, "corrupt");
    await assert.rejects(syncShareInbox(f.options), /could not be read/);
    assert.match((await getShareInboxStatus(f.options)).error ?? "", /preserved/);
    assert.equal(await fs.readFile(filename, "utf8"), "corrupt");
    await fs.rm(path.join(f.root, "inbox"), { recursive: true });
    const external = path.join(f.base, "external"); await fs.mkdir(external);
    await fs.symlink(external, path.join(f.root, "inbox"));
    await assert.rejects(syncShareInbox(f.options));
    assert.deepEqual(await fs.readdir(external), []);
    await fs.unlink(path.join(f.root, "inbox"));
    await fs.rename(f.inboxPath, path.join(f.base, "original-inbox"));
    await fs.symlink(path.join(f.base, "original-inbox"), f.inboxPath);
    const result = await syncShareInbox(f.options);
    assert.equal(result.available, false); assert.equal(result.items.length, 0);
    assert.equal(await fs.readFile(path.join(f.base, "original-inbox", "source.txt"), "utf8"), "https://example.com/shared");
  } finally { await f.cleanup(); }
});
