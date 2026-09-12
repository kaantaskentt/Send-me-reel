import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { runLocalJsonWorker } from "../web/src/lib/local-json-worker.js";
import { inspectLocalUpload } from "../web/src/lib/local-upload-inspector.js";
import { parseUploadInspectionRequest, type UploadInspectionResponse } from "../src/contracts/upload-inspection.js";
import { receiveUpload } from "../src/services/uploadStore.js";
import { inspectUploadFile } from "../src/services/uploadedContent.js";

const cwd = process.cwd();
const run = (script: string, input: unknown = {}, options: { signal?: AbortSignal; timeoutMs?: number; maxOutputBytes?: number } = {}) =>
  runLocalJsonWorker(process.execPath, ["-e", script], input, { cwd, env: { PATH: process.env.PATH }, ...options });

test("local worker transports text as JSON, never shell syntax or credential arguments", async () => {
  const input = { question: "$(touch /never-run) `echo nope`\nTürkçe \"quotes\"" };
  const output = await run("let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>process.stdout.write(s));", input);
  assert.deepEqual(output, input);
  await assert.rejects(run("process.stderr.write('private-provider-secret');process.exit(1)"), error => {
    assert.equal((error as Error).message, "The local media worker could not finish."); return true;
  });
  await assert.rejects(run("process.stdout.write('not JSON')"), /invalid response/);
});

test("local worker output, deadline and cancellation are bounded", async () => {
  await assert.rejects(run("process.stdout.write('x'.repeat(10000));setInterval(()=>{},1000)", {}, { maxOutputBytes: 100 }), /too large/);
  await assert.rejects(run("setInterval(()=>{},1000)", {}, { timeoutMs: 100 }), /timed out/);
  const controller = new AbortController();
  const pending = run("setInterval(()=>{},1000)", {}, { signal: controller.signal });
  setTimeout(() => controller.abort(), 100);
  await assert.rejects(pending, /cancelled/);
  await assert.rejects(run("process.exit(0)", {}, { signal: AbortSignal.abort() }));
});

test("worker completion and cancellation also retire same-group descendants", { skip: process.platform === "win32" }, async () => {
  for (const mode of ["complete", "cancel"] as const) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-worker-descendant-"));
    const pidFile = path.join(directory, "descendant.pid");
    const heartbeat = path.join(directory, "heartbeat");
    let pid: number | undefined;
    try {
      const descendant = "const fs=require('node:fs');process.on('SIGTERM',()=>{});" +
        "fs.writeFileSync(" + JSON.stringify(pidFile) + ",String(process.pid));" +
        "setInterval(()=>fs.writeFileSync(" + JSON.stringify(heartbeat) + ",String(Date.now())),20);";
      const worker = "const fs=require('node:fs');" +
        "require('node:child_process').spawn(process.execPath,['-e'," + JSON.stringify(descendant) + "],{stdio:'ignore'});" +
        "const ready=setInterval(()=>{if(fs.existsSync(" + JSON.stringify(heartbeat) + ")){" +
        "clearInterval(ready);process.stdout.write('{}');" +
        (mode === "complete" ? "process.exit(0);" : "") + "}},10);";
      const controller = new AbortController();
      const pending = run(worker, {}, { signal: controller.signal, timeoutMs: 10_000 });
      // Install rejection handling before intentionally aborting the worker.
      const outcome = pending.then(value => ({ value }), error => ({ error }));
      const deadline = Date.now() + 5_000;
      while (Date.now() < deadline) {
        try {
          pid = Number(await fs.readFile(pidFile, "utf8"));
          await fs.access(heartbeat);
          break;
        } catch { await new Promise(resolve => setTimeout(resolve, 20)); }
      }
      assert.ok(pid && Number.isSafeInteger(pid), "The descendant must start before testing cleanup.");
      if (mode === "cancel") controller.abort();
      const result = await outcome;
      if (mode === "cancel") {
        assert.ok("error" in result);
        assert.match((result.error as Error).message, /cancelled/);
      } else {
        assert.ok("value" in result);
        assert.deepEqual(result.value, {});
      }
      // PID existence alone is unreliable for briefly unreaped zombie processes.
      // A running descendant would continue to update this file every 20 ms.
      await new Promise(resolve => setTimeout(resolve, 50));
      const stopped = await fs.readFile(heartbeat, "utf8");
      await new Promise(resolve => setTimeout(resolve, 250));
      assert.equal(await fs.readFile(heartbeat, "utf8"), stopped, mode + " left a descendant running");
    } finally {
      if (pid) { try { process.kill(pid, "SIGKILL"); } catch { /* Already retired by the worker transport. */ } }
      await fs.rm(directory, { recursive: true, force: true });
    }
  }
});

test("hosted runtime refuses inspection before attempting a process or reading a source", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    await assert.rejects(inspectLocalUpload({ uploadRoot: "/does-not-exist", uploadId: "11111111-1111-4111-8111-111111111111", question: "Read it", apiKey: "fixture-only" }), /only in the connected local studio/);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
  assert.throws(() => parseUploadInspectionRequest({ uploadRoot: "/tmp", uploadId: "../secret", question: "Read it" }));
  assert.throws(() => parseUploadInspectionRequest({ uploadRoot: "/tmp", uploadId: "11111111-1111-4111-8111-111111111111", question: "Read it", apiKey: "must-not-cross-stdin" }));
});

test("the actual local upload worker reinspects an image and returns evidence and usage through the process boundary", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-inspection-worker-"));
  try {
    const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: "white" } }).png().toBuffer();
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(png); controller.close(); } });
    const manifest = await receiveUpload(root, stream, "fixture.png");
    await inspectUploadFile(root, manifest.id);
    const output = await runLocalJsonWorker(process.execPath, ["--import", "tsx", "--import", "./tests/fixtures/upload-inspection-provider.mjs", "scripts/inspect-upload.ts"], {
      uploadRoot: root, uploadId: manifest.id, question: "Which repository is visible?",
    }, { cwd, env: { PATH: process.env.PATH, NODE_ENV: "development", CONTEXTDROP_LOCAL_STUDIO: "1", GEMINI_API_KEY: "fixture-only-not-a-real-key" } }) as UploadInspectionResponse;
    assert.equal(output.version, 1);
    assert.equal(output.ok, true);
    if (!output.ok) assert.fail(output.error.message);
    assert.equal(output.result.sourceUrl, `contextdrop://upload/${manifest.id}`);
    assert.equal(output.result.evidence.observations[0].page, 1);
    assert.deepEqual(output.result.evidence.observations[0].urls, ["https://github.com/example/project"]);
    assert.equal(output.result.usage.totalTokenCount, 120);
    assert.deepEqual(output.result.warnings, []);
    assert.ok(!JSON.stringify(output).includes("fixture-only-not-a-real-key"));
    assert.ok((await fs.stat(path.join(root, manifest.id, "source.png"))).size > 0);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("inspection cancellation lets a slow provider deletion finish before settling", { timeout: 15_000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-inspection-cleanup-"));
  const controller = new AbortController();
  const fixtureEnvironment = {
    NODE_ENV: "development",
    CONTEXTDROP_LOCAL_STUDIO: "1",
    NODE_OPTIONS: "--import=" + pathToFileURL(path.join(cwd, "tests/fixtures/upload-inspection-provider.mjs")).href,
    CONTEXTDROP_TEST_SLOW_DELETE_DIRECTORY: root,
  };
  const previous = Object.fromEntries(Object.keys(fixtureEnvironment).map(key => [key, process.env[key]]));
  let outcome: Promise<{ error?: unknown }> | undefined;
  try {
    const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: "white" } }).png().toBuffer();
    const stream = new ReadableStream<Uint8Array>({ start(value) { value.enqueue(png); value.close(); } });
    const manifest = await receiveUpload(root, stream, "fixture.png");
    await inspectUploadFile(root, manifest.id);
    Object.assign(process.env, fixtureEnvironment);
    // Exercise the production wrapper's configured grace, not a test override
    // of the generic transport. This same signal is used by the outer chat.
    outcome = inspectLocalUpload({
      uploadRoot: root, uploadId: manifest.id, question: "Inspect this image",
      apiKey: "fixture-only-not-a-real-key", signal: controller.signal,
    }).then(() => ({}), error => ({ error }));
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      try { await fs.access(path.join(root, "generation-started")); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 20)); }
    }
    await fs.access(path.join(root, "generation-started"));
    controller.abort();
    const result = await outcome;
    assert.match((result.error as Error)?.message ?? "", /cancelled/);
    assert.equal(await fs.readFile(path.join(root, "delete-state"), "utf8"), "finished",
      "Cancelling inspection must not cut off the provider-file cleanup deadline.");
    assert.ok((await fs.stat(path.join(root, manifest.id, "source.png"))).size > 0);
  } finally {
    controller.abort();
    await outcome;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await fs.rm(root, { recursive: true, force: true });
  }
});
