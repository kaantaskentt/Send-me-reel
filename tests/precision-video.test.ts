import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { scanPrecisionVideo, discoverPrecisionRegion, PRECISION_VIDEO_LIMITS, type PrecisionVideoManifest } from "../src/services/precisionVideo.js";
import { loadPrecisionInputs, captureDownloadedVideo } from "../src/services/precisionVideoCapture.js";
import { withGeminiFile } from "../src/services/geminiFiles.js";
import { buildGeminiVideoRequest, captureGeminiVideo, parseNativeVideoResponse, type GeminiPrecisionInput } from "../src/services/geminiVideo.js";

const width = 960, height = 540, targetIndex = 17;
const id = "00000000-0000-4000-8000-000000000001";
const source = `contextdrop://upload/${id}`;
const file = { fileUri: "https://generativelanguage.googleapis.com/v1beta/files/fixture", mimeType: "video/mp4" };
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

async function sandbox(work: (directory: string) => Promise<void>) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-precision-"));
  try { await work(directory); } finally { await fs.rm(directory, { recursive: true, force: true }); }
}

/** Synthetic pixels only. Stream reused buffers into a lossless encoder; never fetch accounts or media. */
async function fixture(directory: string, options: { target?: boolean; targetFrame?: number; earlyNoise?: boolean; textured?: boolean; frames?: number; motion?: boolean; shifted?: boolean } = {}) {
  assert.ok(ffmpegPath);
  const frames = options.frames ?? 60;
  const base = Buffer.alloc(width * height * 3, 32);
  if (options.textured) {
    let seed = 123456789;
    for (let i = 0; i < base.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; base[i] = seed >>> 24; }
  }
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="rgb(32,32,32)"/><text x="70" y="280" font-family="monospace" font-size="24" fill="white">github.com/example/rapid-q7x</text></svg>`);
  const target = await sharp(svg).removeAlpha().raw().toBuffer();
  const noise = Buffer.from(base);
  for (let y = 10; y < 30; y++) for (let x = 10; x < 30; x += 4) noise.fill(220, (y * width + x) * 3, (y * width + x) * 3 + 3);
  const moving = Buffer.from(target);
  for (let index = 0; index < moving.length; index++) moving[index] = 255 - moving[index];
  const videoPath = path.join(directory, "synthetic.mkv");
  const child = spawn(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${width}x${height}`, "-r", "30", "-i", "pipe:0",
    ...(options.shifted ? ["-vf", "setpts=PTS+2/TB"] : []), "-c:v", "ffv1", "-pix_fmt", "bgr0", "-threads", "1", videoPath], { stdio: ["pipe", "ignore", "pipe"] });
  const done = new Promise<void>((resolve, reject) => { child.once("error", reject); child.once("close", code => code === 0 ? resolve() : reject(new Error("Synthetic encoder failed"))); });
  child.stderr.resume();
  const timer = setTimeout(() => child.kill("SIGKILL"), 20_000);
  try {
    for (let frame = 0; frame < frames; frame++) {
      const buffer = options.motion ? frame % 2 ? moving : target : options.target && frame === (options.targetFrame ?? targetIndex) ? target : options.earlyNoise && [16, 18].includes(frame) ? noise : base;
      if (!child.stdin.write(buffer)) await once(child.stdin, "drain");
    }
    child.stdin.end(); await done;
  } finally { clearTimeout(timer); child.kill("SIGKILL"); await done; }
  return { videoPath, base, target, durationSeconds: frames / 30 };
}

test("streaming scan preserves one-frame visible text from decoded pixels and measured PTS before cropping", { timeout: 30_000 }, async () => sandbox(async directory => {
  const f = await fixture(directory, { target: true });
  const manifest = await scanPrecisionVideo({ ...f, outputDirectory: directory });
  assert.equal(manifest.status, "complete");
  assert.equal(manifest.decodedFrames, 60);
  assert.equal(manifest.coverage.decoderReachedEnd, true);
  assert.equal(manifest.coverage.semanticCoverage, "partial");
  const target = manifest.crops.find(crop => crop.frameIndex === targetIndex);
  assert.ok(target, "A one-frame target between whole-second samples must survive");
  assert.equal(target.reason, "changed_region");
  assert.equal(target.pts, "567"); // Matroska muxer time base is milliseconds, not invented frameIndex / FPS.
  assert.equal(target.timeBase, "1/1000");
  assert.equal(target.timestampSec, 0.567);
  assert.notEqual(target.timestampSec, 0.57);
  const sourcePixels = await sharp(target.sourceFramePath).removeAlpha().raw().toBuffer();
  assert.deepEqual(sourcePixels, f.target, "Saved full frame must retain the exact decoded RGB target");
  assert.ok(target.box.width < width && target.box.height < height);
  const cropPixels = await sharp(target.cropPath).removeAlpha().raw().toBuffer();
  const expectedCrop = await sharp(f.target, { raw: { width, height, channels: 3 } }).extract(target.box).raw().toBuffer();
  assert.deepEqual(cropPixels, expectedCrop);
  assert.equal(digest(await fs.readFile(target.sourceFramePath)), target.sourceFrameSha256);
  assert.equal(manifest.sourceSha256, digest(await fs.readFile(f.videoPath)));
  assert.equal(target.resourceIdentity, "unverified");
  const inputs = await loadPrecisionInputs(manifest);
  const request = buildGeminiVideoRequest(source, { startSec: 0, endSec: 2 }, "Find visible resources", undefined, file, inputs);
  assert.ok(request.contents[0].parts.some(part => "fileData" in part));
  assert.equal(request.contents[0].parts.filter(part => "inlineData" in part).length, inputs.length);
  assert.equal(request.generationConfig.mediaResolution, "MEDIA_RESOLUTION_LOW");
  for (const part of request.contents[0].parts) if ("inlineData" in part) assert.deepEqual(part.mediaResolution, { level: "MEDIA_RESOLUTION_HIGH" });
  const olderModel = buildGeminiVideoRequest(source, { startSec: 0, endSec: 2 }, "Find visible resources", undefined, file, inputs, "gemini-2.5-flash");
  assert.equal(olderModel.generationConfig.mediaResolution, "MEDIA_RESOLUTION_HIGH");
  for (const part of olderModel.contents[0].parts) if ("inlineData" in part) assert.equal(part.mediaResolution, undefined);
  assert.ok(!JSON.stringify(request).includes("rapid-q7x"), "No expected answer is supplied in the prompt");
  await fs.writeFile(target.cropPath, "altered");
  await assert.rejects(loadPrecisionInputs(manifest), /no longer matches/);
}));

test("early small changes cannot consume the later screen-detail window", { timeout: 30_000 }, async () => sandbox(async directory => {
  const f = await fixture(directory, { target: true, targetFrame: 27, earlyNoise: true });
  const result = await scanPrecisionVideo({ ...f, outputDirectory: directory });
  const target = result.crops.find(crop => crop.frameIndex === 27);
  assert.ok(target, "The later one-frame URL must survive even after earlier changes in that part of the video");
  assert.deepEqual(await sharp(target.sourceFramePath).removeAlpha().raw().toBuffer(), f.target);
  assert.ok(result.crops.length <= result.limits.maxCrops);
  const artifacts = await fs.readdir(path.dirname(target.sourceFramePath));
  assert.equal(artifacts.length, result.crops.length * 2, "Replaced artifacts must not accumulate");
}));

test("negative control discovers no text-change region and records only bounded uncertainty anchors", { timeout: 30_000 }, async () => sandbox(async directory => {
  const f = await fixture(directory);
  const result = await scanPrecisionVideo({ ...f, outputDirectory: directory });
  assert.equal(result.candidateFrames, 0);
  assert.ok(result.crops.length > 0 && result.crops.length <= 4);
  assert.ok(result.crops.every(crop => crop.reason === "coverage_anchor" && crop.resourceIdentity === "unverified"));
  assert.equal(result.coverage.semanticCoverage, "partial");
  assert.match(result.limitations.join(" "), /Low-contrast/);
  assert.deepEqual(discoverPrecisionRegion(f.base, f.base, width, height).box, undefined);
}));

test("large early images leave a byte allowance for details in every later quarter", { timeout: 30_000 }, async () => sandbox(async directory => {
  const f = await fixture(directory, { textured: true });
  const result = await scanPrecisionVideo({ ...f, outputDirectory: directory, limits: { maxCropBytes: 120_000 } });
  assert.equal(result.status, "complete");
  const anchors = result.crops.filter(crop => crop.reason === "coverage_anchor");
  assert.equal(anchors.length, 4);
  assert.ok(anchors.some(crop => crop.timestampSec >= 1.5), "The first noisy image must not starve the last quarter");
  assert.ok(result.cropBytes <= 120_000);
  for (const crop of anchors) {
    const expected = await sharp(f.base, { raw: { width, height, channels: 3 } }).extract(crop.box).raw().toBuffer();
    assert.deepEqual(await sharp(crop.cropPath).raw().toBuffer(), expected, "Tighter crops must still preserve their original pixels");
  }
}));

test("source PTS and timeline origin survive nonzero container start time without reseeking", { timeout: 30_000 }, async () => sandbox(async directory => {
  const f = await fixture(directory, { target: true, shifted: true });
  const result = await scanPrecisionVideo({ ...f, outputDirectory: directory });
  const crop = result.crops.find(crop => crop.frameIndex === targetIndex);
  assert.ok(crop);
  assert.equal(result.timelineOriginSec, 2);
  assert.equal(crop.pts, "2567");
  assert.ok(Math.abs(crop.timestampSec - 0.567) < 1e-12);
  assert.deepEqual(await sharp(crop.sourceFramePath).removeAlpha().raw().toBuffer(), f.target);
}));

test("motion, crop, frame and byte budgets retain explicit partial inspection instead of unlimited crops", { timeout: 30_000 }, async () => sandbox(async directory => {
  const f = await fixture(directory, { motion: true });
  const result = await scanPrecisionVideo({ ...f, outputDirectory: directory, limits: { maxFrames: 24, maxCrops: 3 } });
  assert.equal(result.status, "partial");
  assert.equal(result.stopReason, "frame_budget");
  assert.equal(result.decodedFrames, 24);
  assert.ok(result.skippedCandidates > 0);
  assert.ok(result.motionFrames > 0, "Background motion must be counted separately from text-like region candidates");
  assert.ok(result.crops.length <= 3);
  assert.equal(result.maxResidentSourceFrames, 2);
  assert.ok(result.artifactBytes <= result.limits.maxArtifactBytes);
  assert.ok(result.cropBytes <= result.limits.maxCropBytes);
  assert.ok(result.coverage.unscannedRanges[0].startSec < 1);
  const exhausted = await scanPrecisionVideo({ ...f, outputDirectory: directory, limits: { maxArtifactBytes: 100 } });
  assert.equal(exhausted.stopReason, "artifact_budget");
  assert.equal(exhausted.crops.length, 0);
  assert.equal(exhausted.artifactBytes, 0);
  await assert.rejects(scanPrecisionVideo({ ...f, outputDirectory: directory, limits: { maxCrops: PRECISION_VIDEO_LIMITS.maxCrops + 1 } }), /partial/);
}));

test("regional detector uses color channels and makes its low-contrast threshold failure explicit", () => {
  const w = 64, h = 64, previous = Buffer.alloc(w * h * 3, 32), color = Buffer.from(previous), faint = Buffer.from(previous);
  for (let y = 10; y < 30; y++) for (let x = 10; x < 40; x += 4) {
    color[(y * w + x) * 3 + 2] = 200;
    faint[(y * w + x) * 3 + 2] = 39;
  }
  assert.ok(discoverPrecisionRegion(color, previous, w, h).box, "Blue-only text-like edges must not disappear in a red-only comparison");
  assert.equal(discoverPrecisionRegion(faint, previous, w, h).box, undefined, "A below-threshold candidate remains a known miss, not complete coverage");
});

test("cancellation checkpoints partial coverage, stops decoding, and makes no later artifact writes", { timeout: 30_000 }, async () => sandbox(async directory => {
  const f = await fixture(directory, { motion: true });
  const controller = new AbortController();
  const checkpoints: PrecisionVideoManifest[] = [];
  await assert.rejects(scanPrecisionVideo({ ...f, outputDirectory: directory, signal: controller.signal, onCheckpoint: async manifest => {
    checkpoints.push(manifest);
    if (manifest.decodedFrames >= 2) controller.abort(new Error("Synthetic cancellation"));
  } }), /Synthetic cancellation/);
  const last = checkpoints.at(-1)!;
  assert.equal(last.status, "cancelled");
  assert.equal(last.coverage.decoderReachedEnd, false);
  assert.ok(last.decodedFrames < 60);
  const listing = await fs.readdir(directory, { recursive: true });
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.deepEqual(await fs.readdir(directory, { recursive: true }), listing);
  await assert.rejects(scanPrecisionVideo({ ...f, outputDirectory: directory, signal: controller.signal }), /Synthetic cancellation/);
}));

async function precisionInput(): Promise<GeminiPrecisionInput> {
  const bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: "black" } }).png().toBuffer();
  return { id: "frame-17", timestampSec: 17 / 30, sha256: digest(bytes), data: bytes.toString("base64") };
}
function modelBody(crops: GeminiPrecisionInput[] = [], overrides: Record<string, unknown> = {}) {
  const fields = { description: "Synthetic observation", onScreenText: [], urls: [], tools: [], uncertain: true };
  return { candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ summary: "Synthetic overview", limitations: [],
    observations: [{ ...fields, timestamp: "00:00", speech: "Model paraphrase", precisionCropId: "frame-999" }],
    precisionObservations: crops.map(crop => ({ ...fields, cropId: crop.id, timestampSec: 999, speech: "Invented speech" })), ...overrides }) }] } }],
    usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 40, totalTokenCount: 160 } };
}

test("hybrid response matches crop IDs to exact local time; rejects duplicate, missing and fabricated crop IDs", async () => {
  const crop = await precisionInput();
  const body = modelBody([crop]);
  const evidence = parseNativeVideoResponse(body, { startSec: 0, endSec: 2 }, [crop]);
  assert.equal(evidence.observations[0].precisionCropId, undefined);
  assert.equal(evidence.observations[1].timestampSec, 17 / 30);
  assert.equal(evidence.observations[1].precisionCropId, crop.id);
  assert.equal(evidence.observations[1].speech, "");
  for (const precisionObservations of [[], [{ cropId: "frame-18" }], [{ cropId: crop.id }, { cropId: crop.id }]]) {
    assert.throws(() => parseNativeVideoResponse(modelBody([crop], { precisionObservations }), { startSec: 0, endSec: 2 }, [crop]));
  }
  assert.throws(() => buildGeminiVideoRequest(source, { startSec: 0, endSec: 2 }, "", undefined, file, [{ ...crop, sha256: "a".repeat(64) }]), /do not match/);
  assert.throws(() => buildGeminiVideoRequest(source, { startSec: 0, endSec: 2 }, "", undefined, file, [crop, crop]), /Invalid precision/);
});

test("a readable screen with many lines stays usable and keeps its late repository clue", async () => {
  const crop = await precisionInput();
  const lines = Array.from({ length: 35 }, (_, index) => `Visible README line ${index + 1}`);
  lines[34] = "github.com/example/visible-project";
  const item = { cropId: crop.id, description: "A README on screen", onScreenText: lines, urls: [], tools: [], uncertain: false };
  const result = parseNativeVideoResponse(modelBody([crop], { precisionObservations: [item] }), { startSec: 0, endSec: 2 }, [crop]);
  assert.deepEqual(result.observations[1].onScreenText, lines);
  assert.throws(() => parseNativeVideoResponse(modelBody([crop], { precisionObservations: [{ ...item, onScreenText: [...lines, 42] }] }), { startSec: 0, endSec: 2 }, [crop]));
  assert.throws(() => parseNativeVideoResponse(modelBody([crop], { precisionObservations: [{ ...item, onScreenText: Array(65).fill("line") }] }), { startSec: 0, endSec: 2 }, [crop]));
});

test("downloaded social URLs retain provenance while Gemini receives only a validated file reference", () => {
  for (const url of ["https://www.instagram.com/reel/synthetic/", "https://www.tiktok.com/@fixture/video/123", "https://x.com/fixture/status/123"]) {
    const request = buildGeminiVideoRequest(url, { startSec: 0, endSec: 2 }, "", undefined, file);
    assert.equal((request.contents[0].parts[0] as { fileData: typeof file }).fileData.fileUri, file.fileUri);
    assert.ok(!JSON.stringify(request).includes(url));
    assert.throws(() => buildGeminiVideoRequest(url, { startSec: 0, endSec: 2 }));
  }
  for (const url of ["https://x.com.attacker.test/status/123", "https://x.com@localhost/", "https://x.com:9000/status/123", "https://example.com/video.mp4"]) {
    assert.throws(() => buildGeminiVideoRequest(url, { startSec: 0, endSec: 2 }, "", undefined, file));
  }
});

test("hybrid manifests record usage and crop hashes without bytes or keys; changed crop input prevents stale resume", async () => {
  const crop = await precisionInput();
  let calls = 0;
  const options = { sourceUrl: source, file, durationSeconds: 2, apiKey: "synthetic-secret", precisionInputs: [crop], fetchImpl: (async (_url: unknown, init?: RequestInit) => {
    calls++;
    const request = JSON.parse(String(init?.body));
    assert.ok(!String(init?.body).includes("synthetic-secret"));
    assert.equal(request.contents[0].parts.filter((part: any) => part.inlineData).length, 1);
    return new Response(JSON.stringify(modelBody([crop])));
  }) as typeof fetch };
  const first = await captureGeminiVideo(options);
  assert.equal(first.status, "complete"); assert.equal(first.usage.totalTokenCount, 160);
  assert.equal(first.precisionInputs?.[0].sha256, crop.sha256);
  assert.ok(!JSON.stringify(first).includes(crop.data)); assert.ok(!JSON.stringify(first).includes("synthetic-secret"));
  await captureGeminiVideo({ ...options, resume: first }); assert.equal(calls, 1);
  await assert.rejects(captureGeminiVideo({ ...options, resume: first, precisionInputs: [{ ...crop, timestampSec: 0.5 }] }), /does not match/);
});

function fakeProvider(signal?: AbortController, invalidFile = false) {
  const calls: Array<{ url: string; method: string; aborted: boolean }> = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input), method = init?.method || "GET";
    calls.push({ url, method, aborted: Boolean(init?.signal?.aborted) });
    assert.ok(!url.includes("synthetic-secret"));
    if (method === "DELETE") { assert.equal(init?.signal?.aborted, false); return new Response(null, { status: 204 }); }
    if (url.includes("/upload/v1beta/files")) return new Response(null, { headers: { "x-goog-upload-url": "https://generativelanguage.googleapis.com/upload/fixture" } });
    if (url.includes("/upload/fixture")) {
      const reader = (init?.body as ReadableStream).getReader();
      while (!(await reader.read()).done) { /* Consume the upload stream deterministically. */ }
      reader.releaseLock();
      signal?.abort(new Error("Synthetic upload cancellation"));
      return new Response(JSON.stringify({ file: { name: "files/fixture", uri: invalidFile ? "https://invalid.test/file" : file.fileUri, mimeType: "video/mp4", state: "ACTIVE" } }));
    }
    if (url.includes(":generateContent")) {
      const request = JSON.parse(String(init?.body));
      assert.equal(request.contents[0].parts.filter((part: any) => part.fileData).length, 1);
      const ids = request.generationConfig.responseSchema.properties.precisionObservations?.items.properties.cropId.enum || [];
      assert.ok(ids.length > 0, "Successful local scan must actually supply crops");
      const crops = ids.map((id: string) => ({ id } as GeminiPrecisionInput));
      return new Response(JSON.stringify(modelBody(crops)));
    }
    assert.fail("No OpenAI/Whisper or unexpected endpoint is allowed in a successful hybrid capture");
  }) as typeof fetch;
  return { calls, fetchImpl };
}

test("downloaded hybrid makes one Gemini request, preserves the compatible evidence envelope, and deletes its uploaded source", { timeout: 30_000 }, async () => sandbox(async directory => {
  const f = await fixture(directory, { target: true });
  const provider = fakeProvider(); const cleanup: boolean[] = [];
  const result = await captureDownloadedVideo({ ...f, captureId: id, outputDirectory: directory, apiKey: "synthetic-secret", fetchImpl: provider.fetchImpl, onCleanup: async deleted => { cleanup.push(deleted); } });
  assert.equal(result.native.status, "complete");
  assert.equal(result.native.usage.totalTokenCount, 160);
  assert.ok(result.precision?.crops.some(crop => crop.frameIndex === 17));
  assert.ok(result.precision?.crops.every(crop => crop.recognition === "submitted"));
  assert.equal(provider.calls.filter(call => call.url.includes(":generateContent")).length, 1);
  assert.deepEqual(cleanup, [true]);
  assert.equal(provider.calls.at(-1)?.method, "DELETE");
  await assert.rejects(captureDownloadedVideo({ ...f, durationSeconds: 601, captureId: id, outputDirectory: directory, apiKey: "synthetic-secret", fetchImpl: provider.fetchImpl }), /10 minutes/);
}));

test("provider source-file cleanup runs after cancellation, consumer failure and malformed file metadata", async () => sandbox(async directory => {
  const filename = path.join(directory, "synthetic.mp4"); await fs.writeFile(filename, "synthetic-file-bytes");
  for (const mode of ["cancel", "consumer-failure", "invalid-file"]) {
    const controller = new AbortController();
    const provider = fakeProvider(mode === "cancel" ? controller : undefined, mode === "invalid-file");
    const cleanup: boolean[] = [];
    await assert.rejects(withGeminiFile(filename, "video/mp4", { apiKey: "synthetic-secret", signal: controller.signal, fetchImpl: provider.fetchImpl }, async () => { throw new Error("Synthetic consumer failure"); }, async deleted => { cleanup.push(deleted); }));
    assert.equal(provider.calls.at(-1)?.method, "DELETE");
    assert.deepEqual(cleanup, [true]);
  }
}));

test("downloaded hybrid rejects oversized sources before starting any provider upload", async () => sandbox(async directory => {
  const videoPath = path.join(directory, "oversized.mp4");
  const handle = await fs.open(videoPath, "w");
  try { await handle.truncate(100 * 1_024 * 1_024 + 1); } finally { await handle.close(); }
  await assert.rejects(captureDownloadedVideo({ videoPath, captureId: id, durationSeconds: 1, outputDirectory: directory, apiKey: "synthetic-secret",
    fetchImpl: (async () => { assert.fail("An oversized source must not be uploaded"); }) as typeof fetch }), /100 MiB/);
}));
