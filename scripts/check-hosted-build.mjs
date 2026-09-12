#!/usr/bin/env node
// Dependency-free: CI runs this BEFORE installing the root worker package.
import assert from "node:assert/strict";
import { execFile, execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const children = new Map();
const execFileAsync = promisify(execFile);
let temporary;
let stopping = false;
const report = (message) => console.log("[hosted] " + message);

function liveGroupMembers(child) {
  // A reaped group leader may leave only zombies on macOS. Sending a group
  // signal in that state can race group retirement; inspect it before retrying.
  const listing = execFileSync("/bin/ps", ["-axo", "pid=,pgid=,stat="], {
    encoding: "utf8", timeout: 2_000, maxBuffer: 8 * 1024 * 1024,
  });
  return listing.split("\n").map(line => line.trim().split(/\s+/))
    .filter(row => Number(row[1]) === child.pid && row[2] && !row[2].startsWith("Z"))
    .map(row => Number(row[0]));
}

function stop(child, signal = "SIGTERM") {
  if (!child.pid) return;
  const exited = child.exitCode !== null || child.signalCode !== null;
  if (exited && (process.platform === "win32" || liveGroupMembers(child).length === 0)) return;
  try {
    // Include npm/Next workers; never terminate another development server.
    process.kill(process.platform === "win32" ? child.pid : -child.pid, signal);
  } catch (error) {
    if (error.code === "ESRCH") return;
    // Ignore EPERM only after the leader exited AND no live group members remain.
    // A permission failure against a live process still fails this gate.
    if (error.code === "EPERM" && exited && process.platform !== "win32" && liveGroupMembers(child).length === 0) return;
    throw new Error("Could not send " + signal + " to owned process group " + child.pid + " (" + error.code + ")", { cause: error });
  }
}

function launch(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: repository, stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32", ...options,
  });
  let output = "";
  const append = (chunk) => { output = (output + chunk.toString()).slice(-24_000); };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  const completed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, output }));
  });
  completed.catch(() => {});
  const task = { child, completed, output: () => output };
  children.set(child, task);
  return task;
}

async function waitForClose(task, milliseconds) {
  let timer;
  try {
    return await Promise.race([
      task.completed.then(() => true, () => true),
      new Promise(resolve => { timer = setTimeout(() => resolve(false), milliseconds); }),
    ]);
  } finally { clearTimeout(timer); }
}

async function retire(task, graceMs = 0) {
  const errors = [];
  const attempt = signal => { try { stop(task.child, signal); } catch (error) { errors.push(error); } };
  const active = task.child.pid && task.child.exitCode === null && task.child.signalCode === null;
  if (active && graceMs) {
    attempt("SIGTERM");
    await waitForClose(task, graceMs);
  }
  attempt("SIGKILL");
  if (!await waitForClose(task, 2_000)) errors.push(new Error("Owned process group " + task.child.pid + " did not close after cleanup"));
  if (!errors.length) children.delete(task.child);
  return errors;
}

function failureWithCleanup(primary, errors, label, output = "") {
  if (!errors.length) return primary;
  const details = errors.map(error => error.message).join("\n");
  return new AggregateError([...(primary ? [primary] : []), ...errors],
    (primary?.message ?? label + " cleanup failed\n" + output) + "\nCleanup errors:\n" + details);
}

async function run(label, command, args, options, timeout) {
  report(label);
  const task = launch(command, args, options);
  let timer;
  let primary;
  let result;
  try {
    result = await Promise.race([
      task.completed,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(label + " timed out")), timeout);
      }),
    ]);
    if (result.code !== 0) throw new Error(label + " failed (" + (result.code ?? result.signal) + ")");
  } catch (error) { primary = error; }
  finally { clearTimeout(timer); }
  const cleanupErrors = await retire(task, 3_000);
  if (primary) primary = new Error(primary.message + "\n" + task.output(), { cause: primary });
  const failure = failureWithCleanup(primary, cleanupErrors, label, task.output());
  if (failure) throw failure;
}

function isPrivateOrGenerated(filename) {
  return filename.split(/[\\/]/).some((part) =>
    part.startsWith(".env") || [".contextdrop", ".git", ".next", "node_modules", ".vercel"].includes(part));
}

async function copyWorkingTree(destination) {
  // git archive would test HEAD instead of current staged/unstaged source edits.
  const { stdout } = await execFileAsync("git", ["ls-files", "--cached", "-z"], {
    cwd: repository, encoding: "utf8", timeout: 30_000, maxBuffer: 4 * 1024 * 1024,
  });
  const files = [...new Set(stdout.split("\0").filter(Boolean))].filter((file) => !isPrivateOrGenerated(file));
  for (const filename of files) {
    const source = path.join(repository, filename);
    let stat;
    try { stat = await fs.lstat(source); } catch (error) {
      if (error.code === "ENOENT") continue; // Respect unstaged deletions too.
      throw error;
    }
    assert(stat.isFile(), "Tracked source must be a regular file: " + filename);
    const target = path.join(destination, filename);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
    await fs.chmod(target, stat.mode);
  }
  for (let ancestor = destination; ; ancestor = path.dirname(ancestor)) {
    await assert.rejects(fs.access(path.join(ancestor, "node_modules")), { code: "ENOENT" },
      "Isolation failed: " + ancestor + "/node_modules already exists");
    if (ancestor === path.dirname(ancestor)) break;
  }
  report("Copied " + files.length + " source files; no local env, captures or installed dependencies");
}

async function walk(directory) {
  const results = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await walk(filename));
    else if (entry.isFile()) results.push(filename);
  }
  return results;
}

async function inspectTraces(sourceRoot) {
  const web = path.join(sourceRoot, "web");
  const traces = (await walk(path.join(web, ".next"))).filter((file) => file.endsWith(".nft.json"));
  assert(traces.length > 0, "Build produced no deployment traces to inspect");
  let references = 0;
  for (const trace of traces) {
    const manifest = JSON.parse(await fs.readFile(trace, "utf8"));
    assert(Array.isArray(manifest.files), "Invalid trace: " + path.relative(web, trace));
    for (const file of manifest.files) {
      references++;
      const target = path.resolve(path.dirname(trace), file);
      const relative = path.relative(sourceRoot, target).split(path.sep).join("/");
      assert(relative !== ".." && !relative.startsWith("../") && !path.isAbsolute(relative),
        "Trace escapes isolated source: " + file);
      assert(!relative.split("/").some((part) => part === ".contextdrop" || part.startsWith(".env")),
        "Private state entered deployment trace: " + relative);
      assert(!relative.startsWith("node_modules/"), "Root worker dependency entered deployment trace: " + relative);
      assert(!/(^|\/)node_modules\/(ffmpeg-static|ffprobe-static|fluent-ffmpeg|pdf-lib)(\/|$)/.test(relative),
        "Local capture dependency entered deployment trace: " + relative);
    }
  }
  report(traces.length + " deployment traces / " + references + " references passed privacy and worker-dependency checks");
}

function request(port, pathname, method = "GET", headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = ["GET", "HEAD", "OPTIONS"].includes(method) ? undefined : "{}";
    const req = http.request({
      hostname: "127.0.0.1", port, path: pathname, method,
      headers: { ...(payload ? { "Content-Type": "application/json", "Content-Length": 2 } : {}), ...headers },
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body = (body + chunk).slice(0, 1_000_000); });
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body }));
      response.on("error", reject);
    });
    req.setTimeout(10_000, () => req.destroy(new Error("Request timed out: " + method + " " + pathname)));
    req.on("error", reject);
    req.end(payload);
  });
}

async function freePort() {
  const reservation = net.createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  return port;
}

function routePath(filename, app) {
  return "/" + path.relative(app, path.dirname(filename)).split(path.sep)
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .map((segment) => /^\[/.test(segment) ? (segment === "[index]" ? "0" : "hosted-gate") : segment).join("/");
}

async function localEndpoints(web) {
  const app = path.join(web, "src/app");
  // These checks remain mandatory even before main has a local studio.
  // Additional local routes are discovered below if introduced in the future.
  const endpoints = [
    { pathname: "/replicate/local", method: "GET" },
    { pathname: "/replicate/demo", method: "GET" },
    { pathname: "/studio/local", method: "GET" },
    { pathname: "/api/local/capture", method: "GET" },
    { pathname: "/api/local/capture", method: "POST" },
  ];
  for (const file of await walk(app)) {
    const pathname = routePath(file, app);
    if (/\/route\.(?:[cm]?[jt]s)$/.test(file) && pathname.startsWith("/api/local/")) {
      const content = await fs.readFile(file, "utf8");
      const methods = [...content.matchAll(/export\s+(?:async\s+function|function|const|let|var)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map((match) => match[1]);
      for (const match of content.matchAll(/export\s*\{([^}]+)\}/g)) {
        for (const exported of match[1].split(",")) {
          const name = exported.trim().split(/\s+as\s+/).at(-1);
          if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(name)) methods.push(name);
        }
      }
      assert(methods.length, "No recognized HTTP methods in " + path.relative(web, file) + "; update the smoke test for this export style");
      for (const method of new Set(methods)) endpoints.push({ pathname, method });
    }
    if (/\/page\.[jt]sx?$/.test(file) && /\/(local|demo)(\/|$)/.test(pathname)) {
      endpoints.push({ pathname, method: "GET" });
    }
  }
  return [...new Map(endpoints.map(endpoint => [endpoint.method + " " + endpoint.pathname, endpoint])).values()];
}

async function smoke(web, env) {
  const port = await freePort();
  const task = launch(process.execPath, [path.join(web, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: web, env });
  const deadline = Date.now() + 60_000;
  let ready = false;
  const checks = async () => {
    while (Date.now() < deadline) {
      if (task.child.exitCode !== null || task.child.signalCode) throw new Error("Production server exited\n" + task.output());
      try {
        const home = await request(port, "/");
        assert.equal(home.status, 200, "Homepage must return HTTP 200");
        assert.match(home.headers["content-type"] ?? "", /text\/html/, "Homepage must return HTML");
        assert.match(home.body, /ContextDrop/, "Homepage must contain ContextDrop");
        assert.match(home.body, /id="preview"/, "The How it works link target must be rendered on the homepage");
        ready = true;
        break;
      } catch (error) {
        if (!["ECONNREFUSED", "ECONNRESET"].includes(error.code)) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    assert(ready, "Production server did not become ready\n" + task.output());
    const login = await request(port, "/login");
    assert.equal(login.status, 200, "Unauthenticated login page must return HTTP 200");
    assert.match(login.body, /Sign in|Log in/i, "Login page must render sign-in content");
    for (const pathname of ["/pricing", "/privacy", "/terms"]) {
      const page = await request(port, pathname);
      assert.equal(page.status, 200, pathname + " must render successfully");
      assert.match(page.headers["content-type"] ?? "", /text\/html/);
    }
    const signup = await request(port, "/signup");
    assert.equal(signup.status, 307, "Signup preserves the existing login redirect");
    assert.equal(signup.headers.location, "/login");
    const dashboard = await request(port, "/dashboard");
    assert([303, 307, 308].includes(dashboard.status), "Unauthenticated dashboard must redirect");
    assert.match(dashboard.headers.location ?? "", /^\/login(?:\?|$)/, "Dashboard must redirect to login");

    const endpoints = await localEndpoints(web);
    const headerCases = [
      { host: "contextdrop.example", origin: "https://contextdrop.example" },
      { host: "localhost:" + port, origin: "http://localhost:" + port, "sec-fetch-site": "same-origin" },
      { host: "127.0.0.1:" + port, origin: "http://127.0.0.1:" + port, "sec-fetch-site": "same-origin", "x-forwarded-host": "localhost:" + port, "x-forwarded-proto": "http" },
    ];
    for (const endpoint of endpoints) {
      for (const headers of headerCases) {
        const response = await request(port, endpoint.pathname, endpoint.method, headers);
        assert.equal(response.status, 404, endpoint.method + " " + endpoint.pathname + " must remain unavailable in production (Host: " + headers.host + ")");
      }
    }
    report("Homepage, login and auth redirect passed; " + endpoints.length + " local route/method combinations returned 404 across " + headerCases.length + " header cases with local opt-in enabled");
  };
  let primary;
  let maximumLifetime;
  try {
    await Promise.race([
      checks(),
      new Promise((resolve, reject) => {
        maximumLifetime = setTimeout(() => reject(new Error("Production smoke exceeded its three-minute deadline")), 3 * 60_000);
      }),
    ]);
  } catch (error) { primary = new Error(error.message + "\nProduction server output:\n" + task.output(), { cause: error }); }
  finally { clearTimeout(maximumLifetime); }
  const errors = await retire(task, 3_000);
  const failure = failureWithCleanup(primary, errors, "Production server", task.output());
  if (failure) throw failure;
}

async function cleanup() {
  const errors = [];
  for (const task of children.values()) errors.push(...await retire(task));
  if (temporary) {
    try { await fs.rm(temporary, { recursive: true, force: true }); }
    catch (error) { errors.push(error); }
  }
  if (errors.length) throw failureWithCleanup(undefined, errors, "Final cleanup");
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    if (stopping) return;
    stopping = true;
    try { await cleanup(); } catch (error) { console.error("[hosted] Cleanup failed — " + error.message); }
    process.exit(signal === "SIGINT" ? 130 : 143);
  });
}

try {
  assert.equal(Number(process.versions.node.split(".")[0]), 24, "Use Node.js 24 to match the Vercel deployment runtime");
  temporary = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-hosted-"));
  const isolated = path.join(temporary, "source");
  await fs.mkdir(isolated);
  await copyWorkingTree(isolated);
  const isolatedHome = path.join(temporary, "home");
  await fs.mkdir(isolatedHome);
  const userNpmrc = path.join(temporary, "user-npmrc");
  const globalNpmrc = path.join(temporary, "global-npmrc");
  await Promise.all([fs.writeFile(userNpmrc, ""), fs.writeFile(globalNpmrc, "")]);
  const env = {
    // npm run prepends checkout node_modules/.bin; do not leak those tools into
    // the isolated build and accidentally hide an undeclared CLI dependency.
    PATH: [path.dirname(process.execPath), ...(process.env.PATH ?? "").split(path.delimiter)
      .filter((entry) => entry && !entry.split(/[\\/]/).includes("node_modules"))].join(path.delimiter),
    HOME: isolatedHome, TMPDIR: temporary,
    ...(process.platform === "win32" ? { SystemRoot: process.env.SystemRoot, USERPROFILE: isolatedHome } : {}),
    CI: "true", NEXT_TELEMETRY_DISABLED: "1", NODE_ENV: "production",
    npm_config_userconfig: userNpmrc, npm_config_globalconfig: globalNpmrc,
    npm_config_cache: path.join(os.homedir(), ".npm"),
    // No account, API key, database credential or copied environment file.
    // Opt in deliberately: production must still deny every local endpoint.
    CONTEXTDROP_LOCAL_STUDIO: "1", APP_URL: "https://contextdrop.example",
  };
  const web = path.join(isolated, "web");
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  await run("Install web lockfile only (root dependencies absent)", npm, ["ci", "--include=dev", "--no-audit", "--no-fund"], { cwd: web, env }, 10 * 60_000);
  await run("Build hosted production app", npm, ["run", "build"], { cwd: web, env }, 15 * 60_000);
  await inspectTraces(isolated);
  await smoke(web, env);
  report("PASS — clean web-only production build, deploy traces and unauthenticated smoke checks");
} catch (error) {
  console.error("[hosted] FAIL — " + (error.stack ?? error));
  process.exitCode = 1;
} finally {
  try { await cleanup(); } catch (error) {
    console.error("[hosted] Cleanup failed — " + (error.stack ?? error));
    process.exitCode = 1;
  }
}
