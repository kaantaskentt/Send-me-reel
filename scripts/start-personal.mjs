#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, openSync } from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import dotenv from "dotenv";

export const PERSONAL_ORIGIN = "http://127.0.0.1:3127";
export const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const report = message => console.log("[ContextDrop] " + message);

/** Reuse only this checkout's live launcher and its local companion handshake. */
export async function runningPersonalSession(root, fetcher = fetch) {
  try {
    const directory = path.join(root, ".contextdrop");
    const [session, lock] = await Promise.all(["personal-session.json", "personal-launch.lock"].map(async name => JSON.parse(await fs.readFile(path.join(directory, name), "utf8"))));
    if (session.origin !== PERSONAL_ORIGIN || session.pid !== lock.pid || !Number.isSafeInteger(session.pid) || session.pid <= 0) return null;
    for (const pid of [session.pid, session.webPid, session.companionPid]) {
      if (!Number.isSafeInteger(pid) || pid <= 0) return null;
      process.kill(pid, 0);
    }
    const response = await fetcher(PERSONAL_ORIGIN + "/api/local/health", { redirect: "error", signal: AbortSignal.timeout(5_000) });
    if (!response.ok) { await response.body?.cancel(); return null; }
    const text = await response.text();
    if (text.length > 16_384) return null;
    const health = JSON.parse(text);
    return health.version === 1 && health.companion?.connected === true ? session : null;
  } catch { return null; }
}

function openPersonalApp() {
  const child = spawn("/usr/bin/open", [PERSONAL_ORIGIN + "/replicate/local"], { stdio: "ignore", shell: false });
  child.once("error", () => report("Open the local address above in your browser."));
}

export function personalEnvironment(root, inherited = process.env) {
  const env = { ...inherited };
  const files = ["web/.env.development.local", "web/.env.local", "web/.env.development", "web/.env", ".env"];
  dotenv.config({ path: files.map(file => path.join(root, file)), processEnv: env, quiet: true, override: false });
  return { ...env, NODE_ENV: "development", CONTEXTDROP_LOCAL_STUDIO: "1", LOCAL_STUDIO_ORIGIN: PERSONAL_ORIGIN, CONTEXTDROP_TERMINAL_MODE: "exec", NEXT_TELEMETRY_DISABLED: "1" };
}

export function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", () => reject(new Error(`Port ${port} is already in use. Close the app using it, then start ContextDrop again. No existing process was stopped.`)));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => server.close(error => error ? reject(error) : resolve()));
  });
}

export async function acquireLauncherLock(filename) {
  const nonce = randomUUID();
  const create = () => fs.open(filename, "wx", 0o600);
  let lock;
  try { lock = await create(); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    let previous;
    try { previous = JSON.parse(await fs.readFile(filename, "utf8")); }
    catch { throw new Error("The personal launch lock could not be read. Inspect .contextdrop/personal-launch.lock before retrying."); }
    if (!Number.isSafeInteger(previous.pid) || previous.pid <= 0) throw new Error("The personal launch lock is invalid. Inspect .contextdrop/personal-launch.lock before retrying.");
    let gone = false;
    try { process.kill(previous.pid, 0); } catch (failure) { gone = failure.code === "ESRCH"; }
    if (!gone) throw new Error("ContextDrop already has a launcher running. Use its window, or stop that launcher before starting another.");
    await fs.unlink(filename);
    try { lock = await create(); } catch { throw new Error("Another ContextDrop launcher is starting. Try again shortly."); }
  }
  try { await lock.writeFile(JSON.stringify({ pid: process.pid, nonce })); } finally { await lock.close(); }
  return async () => {
    try {
      const current = JSON.parse(await fs.readFile(filename, "utf8"));
      if (current.nonce === nonce) await fs.unlink(filename);
    } catch { /* Never delete another launcher's state. */ }
  };
}

/** Only signal the process group created by this launcher. */
export async function stopOwnedChild(child, graceMs = 3_000) {
  if (!child.pid) return;
  const signal = name => {
    try { process.kill(process.platform === "win32" ? child.pid : -child.pid, name); }
    catch (error) { if (error.code !== "ESRCH") throw error; }
  };
  signal("SIGTERM");
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    try { process.kill(process.platform === "win32" ? child.pid : -child.pid, 0); }
    catch (error) { if (error.code === "ESRCH") return; throw error; }
    await delay(50);
  }
  signal("SIGKILL");
}

export async function startPersonal(options = {}) {
  if (process.platform !== "darwin") throw new Error("The personal ContextDrop launcher currently requires a Mac.");
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Use Node.js 22 or newer to start ContextDrop.");
  const root = options.root ?? repository;
  if (await runningPersonalSession(root)) {
    report("Already running: " + PERSONAL_ORIGIN + "/replicate/local");
    if (!options.noOpen) openPersonalApp();
    return;
  }
  const privateRoot = path.join(root, ".contextdrop");
  await fs.mkdir(privateRoot, { recursive: true, mode: 0o700 });
  await fs.chmod(privateRoot, 0o700);
  const release = await acquireLauncherLock(path.join(privateRoot, "personal-launch.lock"));
  const children = [];
  const serviceNames = new WeakMap();
  let shuttingDown;
  const sessionPath = path.join(privateRoot, "personal-session.json");
  const sessionId = randomUUID();
  const shutdown = () => shuttingDown ??= (async () => {
    const outcomes = await Promise.allSettled(children.map(child => stopOwnedChild(child)));
    try {
      const stored = JSON.parse(await fs.readFile(sessionPath, "utf8"));
      if (stored.id === sessionId) await fs.unlink(sessionPath);
    } catch { /* Missing or newer metadata is preserved. */ }
    await release();
    const failures = outcomes.flatMap((result, index) => {
      if (result.status !== "rejected") return [];
      const code = typeof result.reason?.code === "string" && /^[A-Z][A-Z0-9_]{0,31}$/.test(result.reason.code) ? result.reason.code : "UNKNOWN";
      return [`${serviceNames.get(children[index]) ?? "service"} (${code})`];
    });
    if (failures.length) throw new Error(`Owned process shutdown reported an error: ${failures.join(", ")}. Inspect the private launch logs.`);
  })();
  const abort = new AbortController();
  const onSignal = () => { abort.abort(); };
  process.once("SIGINT", onSignal); process.once("SIGTERM", onSignal); process.once("SIGHUP", onSignal);
  let failed = false;
  try {
    await assertPortAvailable(3127); await assertPortAvailable(43187);
    const next = path.join(root, "web/node_modules/next/dist/bin/next");
    for (const filename of [next, path.join(root, "node_modules/tsx/package.json")]) {
      try { await fs.access(filename); } catch { throw new Error("Dependencies are missing. Run npm ci and npm --prefix web ci in the project folder first."); }
    }
    const env = personalEnvironment(root);
    const logRoot = path.join(privateRoot, "personal-logs", new Date().toISOString().replace(/[:.]/g, "-") + "-" + sessionId.slice(0, 8));
    await fs.mkdir(logRoot, { recursive: true, mode: 0o700 });
    function launch(name, executable, args, cwd, required = true) {
      const descriptor = openSync(path.join(logRoot, name + ".log"), "a", 0o600);
      let child;
      try { child = spawn(executable, args, { cwd, env, detached: true, stdio: ["ignore", descriptor, descriptor], shell: false }); }
      finally { closeSync(descriptor); }
      children.push(child);
      serviceNames.set(child, name);
      const ended = () => {
        if (shuttingDown) return;
        if (required) { failed = true; abort.abort(); }
        else report("Phone delivery is offline. The app still works; check Phone inbox or restart ContextDrop.");
      };
      child.once("error", ended);
      child.once("exit", ended);
      return child;
    }
    report("Starting your local app and Mac tools. No computer task runs until you request it.");
    const companion = launch("companion", process.execPath, ["--import", "tsx", "scripts/start-local-companion.ts"], root);
    const web = launch("web", process.execPath, [next, "dev", "--hostname", "127.0.0.1", "--port", "3127"], path.join(root, "web"));
    // This assertion ends when this launcher exits, and never changes another chat's caffeinate service.
    launch("awake", "/usr/bin/caffeinate", ["-i", "-w", String(process.pid)], root);
    // Optional phone delivery reads only the paired owner's completed saves. It never polls the Telegram bot.
    const phone = launch("phone", process.execPath, ["--import", "tsx", "scripts/phone-sync.ts"], root, false);
    await fs.writeFile(sessionPath, JSON.stringify({ id: sessionId, pid: process.pid, origin: PERSONAL_ORIGIN, webPid: web.pid, companionPid: companion.pid, phonePid: phone.pid, logDirectory: logRoot, startedAt: new Date().toISOString() }), { mode: 0o600 });
    const deadline = Date.now() + 120_000;
    let health;
    while (!abort.signal.aborted && Date.now() < deadline) {
      try {
        const response = await fetch(PERSONAL_ORIGIN + "/api/local/health", { signal: AbortSignal.timeout(5_000), redirect: "error" });
        if (response.ok) {
          const candidate = await response.json();
          if (candidate.version === 1 && candidate.companion?.connected === true) { health = candidate; break; }
        }
      } catch { /* Next and the companion may still be starting. */ }
      await delay(500, undefined, { signal: abort.signal }).catch(() => {});
    }
    if (failed) throw new Error("A local service stopped during startup. Inspect .contextdrop/personal-logs for details.");
    if (abort.signal.aborted) return;
    if (!health) throw new Error("The local app did not become ready within two minutes. Inspect .contextdrop/personal-logs for details.");
    report("Ready: " + PERSONAL_ORIGIN + "/replicate/local");
    report(health.status === "ready" ? "Content chat and Mac companion are connected. Keep this window open; Ctrl+C stops the app." : "The app is open, but its setup panel shows missing configuration. Keep this window open.");
    report("Your Mac stays awake while this launcher runs. Closing the lid or shutting down still interrupts work.");
    if (!options.noOpen) openPersonalApp();
    if (!abort.signal.aborted) await new Promise(resolve => abort.signal.addEventListener("abort", resolve, { once: true }));
    if (failed) throw new Error("A local service stopped. Inspect .contextdrop/personal-logs, then restart ContextDrop.");
  } finally {
    await shutdown();
    process.removeListener("SIGINT", onSignal); process.removeListener("SIGTERM", onSignal); process.removeListener("SIGHUP", onSignal);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--no-open")) { report("Usage: npm run personal -- [--no-open]"); process.exitCode = 1; }
  else await startPersonal({ noOpen: args.includes("--no-open") }).catch(error => { report(error.message); process.exitCode = 1; });
}
