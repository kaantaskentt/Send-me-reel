import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

// Offline tests use literal placeholders, never developer credentials.
process.env.TELEGRAM_BOT_TOKEN = "offline-test";
process.env.OPENAI_API_KEY = "offline-test";
process.env.SUPABASE_URL = "https://offline-test.invalid";
process.env.SUPABASE_SERVICE_KEY = "offline-test";
const { getSamplingPlan, validateVideoDuration, MAX_ANALYSIS_FRAMES, extractFrames } = await import("../src/services/frameExtractor.js");
const { parseFrameAnalysisResponse, mapWithConcurrency, analyzeFramesDetailed } = await import("../src/services/visualAnalyzer.js");
const { evaluateContent, parseQualityDecision } = await import("../src/services/qualityGate.js");

const frame = (timestampSec: number, description = "The terminal shows an install command") => ({
  timestampSec, description, onScreenText: ["npm install example"], tools: ["Terminal"], urls: [], uncertain: false,
});

test("frame budgets sample the full supported duration instead of truncating the end", () => {
  for (const duration of [1, 29, 60, 120, 599, 600]) {
    const plan = getSamplingPlan(duration);
    assert.ok(Math.ceil(duration / plan.intervalUsed) <= MAX_ANALYSIS_FRAMES);
  }
  assert.equal(getSamplingPlan(20).intervalUsed, 1);
  assert.equal(getSamplingPlan(600).samplingLimited, true);
  for (const duration of [0, -1, NaN, Infinity, 601]) assert.throws(() => validateVideoDuration(duration));
});

test("structured visual evidence retains verbatim text and the source timestamp", () => {
  const parsed = parseFrameAnalysisResponse(JSON.stringify({ frames: [frame(0), frame(1.04)] }), [0, 1.04]);
  assert.deepEqual(parsed[1].onScreenText, ["npm install example"]);
  assert.equal(parsed[1].timestampSec, 1.04);
});

test("missing, reordered, duplicate or malformed visual evidence is rejected", () => {
  const invalid = [
    { frames: [frame(0)] },
    { frames: [frame(1), frame(0)] },
    { frames: [frame(0), frame(0)] },
    { frames: [frame(0), { ...frame(1), onScreenText: [false] }] },
    { frames: [frame(0), { ...frame(1), description: "" }] },
  ];
  for (const value of invalid) assert.throws(() => parseFrameAnalysisResponse(JSON.stringify(value), [0, 1]));
  assert.throws(() => parseFrameAnalysisResponse("Frame at 0s: guessed prose", [0]));
});

test("visual calls have a real concurrency ceiling and retain input order", async () => {
  let active = 0;
  let peak = 0;
  const results = await mapWithConcurrency([0, 1, 2, 3, 4, 5], 2, async (value) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, value % 2 ? 1 : 5));
    active--;
    return value * 2;
  });
  assert.equal(peak, 2);
  assert.deepEqual(results, [0, 2, 4, 6, 8, 10]);
});

test("invalid visual work is rejected before any paid API call", async () => {
  await assert.rejects(analyzeFramesDetailed(Array(MAX_ANALYSIS_FRAMES + 1).fill("unused")), /budget exceeded/);
  await assert.rejects(analyzeFramesDetailed(["unused", "unused"], 1, [1, 0]), /Invalid source frame timestamps/);
  assert.deepEqual(await analyzeFramesDetailed([]), { frames: [], warnings: [], failedFrameCount: 0 });
  const controller = new AbortController();
  controller.abort(new Error("Analysis timed out"));
  await assert.rejects(analyzeFramesDetailed(["unused"], 1, [0], controller.signal), /Analysis timed out/);
});

test("failed frame batches retain explicit coverage gaps without calling an API", async () => {
  const result = await analyzeFramesDetailed(["/nonexistent/offline-test-frame.jpg"], 1, [0]);
  assert.equal(result.failedFrameCount, 1);
  assert.equal(result.frames.length, 0);
  assert.match(result.warnings[0], /0 seconds/);
});

test("long login, challenge and error pages cannot bypass the content gate", async () => {
  for (const caption of [
    "Sign in to continue. This account is private. Create an account to see content.",
    "Title: Page not found\n" + "The requested content is unavailable. ".repeat(20),
    "Title: Just a moment...\nVerify you are human before accessing this page.",
    "This account is private\nSign up to see photos, videos and posts.",
  ]) {
    const decision = await evaluateContent({ transcript: null, caption, visualSummary: null, platform: "youtube", url: "https://youtube.com/watch?v=offline" });
    assert.equal(decision.proceed, false);
  }
});

test("a real login tutorial is not rejected because its caption mentions signing in", async () => {
  const decision = await evaluateContent({
    transcript: "First open the settings panel. Add the provider, configure the callback URL and then test the sign-in button.",
    caption: "Sign in to continue: building a login screen step by step.",
    visualSummary: null, platform: "youtube", url: "https://youtube.com/watch?v=offline",
  });
  assert.equal(decision.proceed, true);
});

test("content gate refuses malformed decision types and contradictory results", () => {
  assert.throws(() => parseQualityDecision('{"proceed":"false","strategy":"abort","reason":"blocked"}'));
  assert.throws(() => parseQualityDecision('{"proceed":true,"strategy":"abort","reason":"blocked"}'));
  assert.deepEqual(parseQualityDecision('{"proceed":false,"strategy":"abort","reason":"blocked"}'), { proceed: false, strategy: "abort", reason: "blocked" });
});

test("synthetic local video yields real timestamps and readable-resolution frames", { timeout: 30_000 }, async () => {
  assert.ok(ffmpegPath, "Bundled ffmpeg must be available");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-evidence-test-"));
  try {
    const videoPath = path.join(directory, "video.mp4");
    await promisify(execFile)(ffmpegPath!, ["-f", "lavfi", "-i", "testsrc=size=1600x900:rate=10", "-t", "3.2", "-c:v", "mpeg4", "-y", videoPath], { timeout: 15_000 });
    const result = await extractFrames(videoPath);
    assert.equal(result.paths.length, 4);
    assert.deepEqual(result.timestampsSec, [0, 1, 2, 3]);
    const metadata = await sharp(result.paths[0]).metadata();
    assert.equal(metadata.width, 1280);
    assert.equal(metadata.height, 720);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
