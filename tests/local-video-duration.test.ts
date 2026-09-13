import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { MAX_ANALYSIS_VIDEO_BYTES } from "../src/services/mediaRuntime";

const script = path.resolve("scripts/analyze-video.ts");
const tsx = path.resolve("node_modules/tsx/dist/loader.mjs");
const source = "https://www.instagram.com/reel/offline_duration_fixture/";

/** A timed-out test must stop its own media process group before deleting files. */
function fixtureProcess(command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv; timeout: number; signal: AbortSignal }) {
  options.signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
    let failure: unknown;
    let outputBytes = 0;
    const kill = () => {
      try { if (child.pid && process.platform !== "win32") process.kill(-child.pid, "SIGKILL"); else child.kill("SIGKILL"); } catch { /* This owned group has already exited. */ }
    };
    const stop = (error: unknown) => { failure ??= error; kill(); };
    const abort = () => stop(options.signal.reason ?? new Error("Fixture cancelled"));
    const timer = setTimeout(() => stop(new Error("Fixture process timed out")), options.timeout);
    const drain = (chunk: Buffer) => { outputBytes += chunk.length; if (outputBytes > 100_000) stop(new Error("Fixture output limit exceeded")); };
    child.stdout.on("data", drain); child.stderr.on("data", drain);
    options.signal.addEventListener("abort", abort, { once: true });
    if (options.signal.aborted) abort();
    const cleanup = () => { clearTimeout(timer); options.signal.removeEventListener("abort", abort); kill(); };
    child.once("error", error => { cleanup(); reject(error); });
    child.once("close", code => {
      cleanup();
      if (failure) reject(failure);
      else if (code !== 0) reject(Object.assign(new Error("Offline fixture process failed"), { code }));
      else resolve();
    });
  });
}

async function fixture(signal: AbortSignal) {
  signal.throwIfAborted();
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-duration-test-"));
  const downloader = path.join(root, "yt-dlp-fixture");
  const metadata = path.join(root, "metadata.json");
  const media = path.join(root, "fixture.mp4");
  const calls = path.join(root, "calls.jsonl");
  // Literal argv and synthetic local files. This fixture does not resolve or fetch the source.
  await fs.writeFile(downloader, `#!${process.execPath}
const fs=require('node:fs');
const args=process.argv.slice(2);
fs.appendFileSync(process.env.FIXTURE_CALLS, JSON.stringify(args)+'\\n');
if(args.includes('--skip-download')) process.stdout.write(fs.readFileSync(process.env.FIXTURE_METADATA));
else if(process.env.FIXTURE_MERGED_BYTES) { const file=args[args.indexOf('-o')+1];fs.closeSync(fs.openSync(file,'w'));fs.truncateSync(file,Number(process.env.FIXTURE_MERGED_BYTES)); }
else fs.copyFileSync(process.env.FIXTURE_MEDIA,args[args.indexOf('-o')+1]);
`, { mode: 0o700 });
  const env = {
    PATH: process.env.PATH, HOME: root, YTDLP_PATH: downloader,
    FIXTURE_CALLS: calls, FIXTURE_METADATA: metadata, FIXTURE_MEDIA: media,
    // Do not inherit the developer's provider keys; dotenv resolves only this empty temporary cwd.
    OPENAI_API_KEY: "", GEMINI_API_KEY: "", GOOGLE_API_KEY: "", DOTENV_CONFIG_QUIET: "true",
  };
  async function run(duration: unknown, mergedBytes?: number) {
    signal.throwIfAborted();
    const output = path.join(root, "capture.json");
    await fs.writeFile(metadata, JSON.stringify({ source: { id: "reel-fixture", title: "Video by fixture_author", uploader: "Fixture Author", uploader_id: "fixture_author", ...(duration === undefined ? {} : { duration }) } }));
    await fs.writeFile(calls, "");
    let exitCode = 0;
    try { await fixtureProcess(process.execPath, ["--import", tsx, script, source, "--output", output, "--timeout-seconds", "30"], { cwd: root, env: { ...env, FIXTURE_MERGED_BYTES: mergedBytes === undefined ? "" : String(mergedBytes) }, timeout: 40_000, signal }); }
    catch (error) { signal.throwIfAborted(); exitCode = Number((error as { code: number }).code); }
    assert.equal(exitCode, 1, "Offline fixture must stop without making any model call");
    return { capture: JSON.parse(await fs.readFile(output, "utf8")), calls: (await fs.readFile(calls, "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line) as string[]) };
  }
  async function video(seconds: number) {
    assert.ok(ffmpegPath);
    await fixtureProcess(ffmpegPath, ["-f", "lavfi", "-i", "testsrc=size=64x64:rate=1", "-t", String(seconds), "-c:v", "mpeg4", "-y", media], { cwd: root, env, timeout: 15_000, signal });
  }
  return { root, media, run, video, cleanup: () => fs.rm(root, { recursive: true, force: true }) };
}

test("Instagram metadata without a usable duration downloads within limits and uses the measured duration before extracting frames", { timeout: 45_000 }, async context => {
  const f = await fixture(context.signal);
  try {
    await f.video(2);
    for (const duration of [undefined, null, "N/A", 0]) {
      const { capture, calls } = await f.run(duration);
      assert.equal(calls.length, 2, "Unknown advertised duration must reach the bounded downloader");
      const download = calls[1];
      assert.equal(download[download.indexOf("--max-filesize") + 1], "100M");
      assert.ok(download.includes("--no-playlist"));
      assert.deepEqual(download.slice(-2), ["--", source]);
      assert.equal(capture.metadata.duration, 2);
      assert.equal(capture.metadata.source_evidence.duration_seconds, 2);
      assert.equal(capture.metadata.authorName, "Fixture Author");
      assert.equal(capture.metadata.authorUsername, "fixture_author");
      const stages = capture.metadata.local_capture.stages;
      assert.deepEqual(stages.map((stage: { stage: string }) => stage.stage), ["metadata", "download", "duration_check", "frame_extraction"]);
      assert.ok(stages.every((stage: { status: string }) => stage.status === "complete"));
      assert.match(capture.error_message, /OpenAI is not configured/);
      assert.equal(capture.metadata.source_evidence.transcript.status, "missing_key");
      assert.equal(capture.metadata.local_capture.openaiConfigured, false);
    }
  } finally { await f.cleanup(); }
});

test("known long metadata rejects before download; actual long or invalid media rejects before frame extraction and model steps", { timeout: 45_000 }, async context => {
  const f = await fixture(context.signal);
  try {
    const known = await f.run(601);
    assert.equal(known.calls.length, 1);
    assert.equal(known.capture.metadata.local_capture.errorCode, "VIDEO_TOO_LONG");
    assert.deepEqual(known.capture.metadata.local_capture.stages.map((stage: { stage: string }) => stage.stage), ["metadata"]);

    await f.video(601);
    for (const metadataDuration of [undefined, 2]) {
      const actualLong = await f.run(metadataDuration);
      assert.equal(actualLong.calls.length, 2);
      assert.equal(actualLong.capture.metadata.local_capture.errorCode, "VIDEO_TOO_LONG");
      assert.deepEqual(actualLong.capture.metadata.local_capture.stages.map((stage: { stage: string }) => stage.stage), ["metadata", "download", "duration_check"]);
      assert.equal(actualLong.capture.metadata.local_capture.stages.at(-1).status, "failed");
      assert.deepEqual(actualLong.capture.metadata.local_evidence.framePaths, []);
      assert.equal(actualLong.capture.metadata.source_evidence.transcript, undefined);
    }
    await fs.writeFile(f.media, Buffer.alloc(2_000));
    const invalid = await f.run(null);
    assert.equal(invalid.capture.metadata.local_capture.stages.at(-1).stage, "duration_check");
    assert.equal(invalid.capture.metadata.local_capture.stages.at(-1).status, "failed");
    assert.deepEqual(invalid.capture.metadata.local_evidence.framePaths, []);
    assert.equal(invalid.capture.metadata.source_evidence.transcript, undefined);
  } finally { await f.cleanup(); }
});

test("an oversized merged local video stops at download before duration, frames or provider work", { timeout: 15_000 }, async context => {
  const f = await fixture(context.signal);
  try {
    // Individual90MiB video+15MiB audio streams can pass yt-dlp's per-file cap.
    // A sparse fixture measures the actual merged file without allocating105MiB.
    const { capture, calls } = await f.run(undefined, MAX_ANALYSIS_VIDEO_BYTES + 5 * 1024 * 1024);
    assert.equal(calls.length, 2);
    assert.equal(capture.metadata.local_capture.errorCode, "VIDEO_TOO_LARGE");
    assert.deepEqual(capture.metadata.local_capture.stages.map((stage: { stage: string }) => stage.stage), ["metadata", "download"]);
    assert.equal(capture.metadata.local_capture.stages.at(-1).status, "failed");
    assert.deepEqual(capture.metadata.local_evidence.framePaths, []);
    assert.equal(capture.metadata.source_evidence.transcript, undefined);
  } finally { await f.cleanup(); }
});

test("cancelling a duration fixture retires its descendant and refuses later subprocesses", { timeout: 10_000, skip: process.platform === "win32" }, async context => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-duration-cancel-"));
  const controller = new AbortController();
  const signal = AbortSignal.any([context.signal, controller.signal]);
  const heartbeat = path.join(root, "heartbeat");
  const worker = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify("const fs=require('node:fs');fs.writeFileSync(" + JSON.stringify(heartbeat) + ",String(Date.now()));setInterval(()=>fs.writeFileSync(" + JSON.stringify(heartbeat) + ",String(Date.now())),20)")}],{stdio:'inherit'});setInterval(()=>{},1000);`;
  const outcome = fixtureProcess(process.execPath, ["-e", worker], { cwd: root, env: { PATH: process.env.PATH }, signal, timeout: 8000 }).then(() => undefined, error => error);
  try {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try { await fs.access(heartbeat); break; } catch { signal.throwIfAborted(); await new Promise(resolve => setTimeout(resolve, 20)); }
    }
    await fs.access(heartbeat);
    controller.abort(new Error("Fixture cancellation requested"));
    assert.match(String(await outcome), /Fixture cancellation requested/);
    const stopped = await fs.readFile(heartbeat, "utf8");
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(await fs.readFile(heartbeat, "utf8"), stopped);
    assert.throws(() => fixtureProcess(process.execPath, ["-e", ""], { cwd: root, env: {}, signal, timeout: 1000 }), /Fixture cancellation requested/);
  } finally { controller.abort(); await outcome; await fs.rm(root, { recursive: true, force: true }); }
});
