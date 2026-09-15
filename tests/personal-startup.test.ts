import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { personalEnvironment, runningPersonalSession, assertPortAvailable, acquireLauncherLock, stopOwnedChild } from "../scripts/start-personal.mjs";
import { readLocalHealth } from "../web/src/lib/local-health";

const env = { NODE_ENV: "development", CONTEXTDROP_LOCAL_STUDIO: "1", OPENAI_API_KEY: "private-openai", GEMINI_API_KEY: "private-gemini" } as NodeJS.ProcessEnv;
const headers = new Headers({ host: "127.0.0.1:3127" });
const ready = { status: "ready", platform: "darwin", version: 1, execution: "streaming-terminal", capabilities: { terminal: true, browser: { configured: true }, harnesses: { codex: true, claude: false } } };

test("reopening the personal app reuses its live checkout and refuses stale or unrelated sessions", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-personal-reopen-"));
  const directory = path.join(root, ".contextdrop");
  try {
    await fs.mkdir(directory);
    const session = { pid: process.pid, webPid: process.pid, companionPid: process.pid, origin: "http://127.0.0.1:3127" };
    await fs.writeFile(path.join(directory, "personal-session.json"), JSON.stringify(session));
    await fs.writeFile(path.join(directory, "personal-launch.lock"), JSON.stringify({ pid: process.pid }));
    let calls = 0;
    const fetcher = async (url: string, options: RequestInit) => {
      calls++; assert.equal(url, session.origin + "/api/local/health"); assert.equal(options.redirect, "error");
      return Response.json({ version: 1, companion: { connected: true } });
    };
    assert.deepEqual(await runningPersonalSession(root, fetcher), session);
    assert.equal(calls, 1);
    assert.equal(await runningPersonalSession(root, async () => Response.json({ version: 1, companion: { connected: false } })), null);
    await fs.writeFile(path.join(directory, "personal-launch.lock"), JSON.stringify({ pid: process.pid + 1 }));
    assert.equal(await runningPersonalSession(root, fetcher), null);
    assert.equal(calls, 1);
    await fs.writeFile(path.join(directory, "personal-session.json"), JSON.stringify({ ...session, origin: "https://remote.example" }));
    assert.equal(await runningPersonalSession(root, fetcher), null);
    assert.equal(calls, 1);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("personal configuration follows explicit environment precedence and forces only local launch settings", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-personal-env-"));
  try {
    await fs.mkdir(path.join(root, "web"));
    await fs.writeFile(path.join(root, ".env"), "OPENAI_API_KEY=root-key\nGEMINI_API_KEY=root-gemini\nCONTEXTDROP_TERMINAL_MODE=interactive\n");
    await fs.writeFile(path.join(root, "web/.env.local"), "OPENAI_API_KEY=web-key\nCONTENT_CHAT_MODEL=test-model\n");
    const inherited = { OPENAI_API_KEY: "explicit-key", NODE_ENV: "production", LOCAL_STUDIO_ORIGIN: "https://example.com" };
    const result = personalEnvironment(root, inherited);
    assert.equal(result.OPENAI_API_KEY, "explicit-key");
    assert.equal(result.GEMINI_API_KEY, "root-gemini");
    assert.equal(result.CONTENT_CHAT_MODEL, "test-model");
    assert.equal(result.CONTEXTDROP_TERMINAL_MODE, "exec");
    assert.equal(result.NODE_ENV, "development");
    assert.equal(result.LOCAL_STUDIO_ORIGIN, "http://127.0.0.1:3127");
    assert.equal(result.CONTEXTDROP_LOCAL_STUDIO, "1");
    assert.equal(inherited.NODE_ENV, "production", "Caller environment must not be mutated");
    assert.equal(personalEnvironment(root, {}).OPENAI_API_KEY, "web-key");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("personal startup refuses an occupied port without disturbing its listener", async () => {
  const listener = net.createServer(socket => socket.end("unrelated"));
  await new Promise<void>(resolve => listener.listen(0, "127.0.0.1", resolve));
  try {
    const port = (listener.address() as net.AddressInfo).port;
    await assert.rejects(assertPortAvailable(port), /already in use/);
    assert.equal(listener.listening, true);
    const message = await new Promise<string>((resolve, reject) => {
      let text = "";
      const socket = net.connect(port, "127.0.0.1");
      socket.on("data", chunk => { text += chunk.toString(); });
      socket.once("end", () => resolve(text)); socket.once("error", reject);
    });
    assert.equal(message, "unrelated");
  } finally { await new Promise<void>(resolve => listener.close(() => resolve())); }
});

test("personal launcher lock refuses a second active owner and preserves replacement metadata", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-personal-lock-"));
  const filename = path.join(root, "lock.json");
  try {
    const release = await acquireLauncherLock(filename);
    await assert.rejects(acquireLauncherLock(filename), /already has a launcher/);
    assert.equal((await fs.stat(filename)).mode & 0o777, 0o600);
    await fs.writeFile(filename, JSON.stringify({ pid: process.pid, nonce: "replacement" }));
    await release();
    assert.equal(JSON.parse(await fs.readFile(filename, "utf8")).nonce, "replacement");
    await fs.writeFile(filename, "corrupt");
    await assert.rejects(acquireLauncherLock(filename), /could not be read/);
    assert.equal(await fs.readFile(filename, "utf8"), "corrupt");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("personal shutdown retires its stubborn child group without signalling other listeners", { skip: process.platform === "win32" }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-personal-stop-"));
  const heartbeat = path.join(root, "heartbeat");
  const pidFile = path.join(root, "pid");
  const descendant = `const fs=require('node:fs');process.on('SIGTERM',()=>{});fs.writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setInterval(()=>fs.writeFileSync(${JSON.stringify(heartbeat)},String(Date.now())),20);`;
  const script = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore'});setInterval(()=>{},1000);`;
  const child = spawn(process.execPath, ["-e", script], { detached: true, stdio: "ignore" });
  let descendantPid: number | undefined;
  try {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      try { descendantPid = Number(await fs.readFile(pidFile, "utf8")); await fs.access(heartbeat); break; } catch { await delay(20); }
    }
    assert.ok(descendantPid);
    await stopOwnedChild(child, 100);
    await delay(100);
    const stopped = await fs.readFile(heartbeat, "utf8");
    await delay(100);
    assert.equal(await fs.readFile(heartbeat, "utf8"), stopped);
  } finally {
    try { process.kill(-child.pid!, "SIGKILL"); } catch { /* already closed */ }
    if (descendantPid) { try { process.kill(descendantPid, "SIGKILL"); } catch { /* already closed */ } }
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("local readiness refuses production and remote hosts before reading credentials or fetching", async () => {
  let operations = 0;
  const dependencies = { env, readToken: async () => { operations++; return "private-token"; }, fetcher: (async () => { operations++; return Response.json(ready); }) as typeof fetch };
  assert.equal(await readLocalHealth(headers, { ...dependencies, env: { ...env, NODE_ENV: "production" } }), null);
  assert.equal(await readLocalHealth(new Headers({ host: "contextdrop.ai" }), dependencies), null);
  assert.equal(await readLocalHealth(new Headers({ host: "127.0.0.1:3127", origin: "https://attacker.example" }), dependencies), null);
  assert.equal(operations, 0);
});

test("local readiness authenticates only to the fixed companion and returns no provider or session data", async () => {
  let calls = 0;
  const health = await readLocalHealth(headers, { env, readToken: async host => { assert.equal(host, "127.0.0.1:3127"); return "private-token"; }, fetcher: (async (url, options) => {
    calls++;
    assert.equal(url, "http://127.0.0.1:43187/health");
    assert.equal(new Headers(options?.headers).get("authorization"), "Bearer private-token");
    assert.equal(new Headers(options?.headers).get("origin"), "http://127.0.0.1:3127");
    assert.equal(options?.redirect, "error");
    return Response.json({ ...ready, token: "private-token", arbitrary: "private-provider-reply" });
  }) as typeof fetch });
  assert.equal(calls, 1);
  assert.equal(health?.status, "ready");
  assert.equal(health?.companion.connected, true);
  assert.equal(health?.companion.execution, "streaming-terminal");
  assert.equal(health?.readers.gemini, true);
  assert.ok(!JSON.stringify(health).includes("private-"));
});

test("local readiness degrades malformed, failed, oversized and unauthenticated companion responses safely", async () => {
  for (const response of [Response.json(ready, { status: 401 }), Response.json({ ...ready, platform: "linux" }), Response.json({ status: "ready", version: 1 }), new Response("private-malformed-json"), new Response("x".repeat(16_385))]) {
    const health = await readLocalHealth(headers, { env, readToken: async () => "private-token", fetcher: (async () => response) as typeof fetch });
    assert.equal(health?.status, "needs_setup");
    assert.equal(health?.companion.connected, false);
    assert.ok(!JSON.stringify(health).includes("private-"));
  }
  const missing = await readLocalHealth(headers, { env: { NODE_ENV: "development", CONTEXTDROP_LOCAL_STUDIO: "1" }, readToken: async () => undefined });
  assert.equal(missing?.chat.configured, false);
  assert.equal(missing?.readers.gemini, false);
  assert.equal(missing?.issues.length, 3);
});
