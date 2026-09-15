/** Local-only, bounded source-pixel discovery. This is a heuristic, not OCR or semantic coverage. */
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { createReadStream, promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import sharp from "sharp";
import { validateVideoDuration } from "./frameExtractor.js";

const execFileAsync = promisify(execFile);
export const PRECISION_VIDEO_POLICY = "source-pixels-regions-v3";
export const PRECISION_VIDEO_LIMITS = Object.freeze({
  maxFrames: 18_000, maxScanMs: 45_000, maxCrops: 12, maxSourcePixels: 8_294_400,
  maxCropPixels: 1_048_576, maxArtifactBytes: 48 * 1_024 * 1_024, maxCropBytes: 6 * 1_024 * 1_024,
});
export const PRECISION_VIDEO_THRESHOLDS = Object.freeze({ tileSize: 128, channelDelta: 8, edgeDelta: 12, minChangedPixels: 8, minEdgePixels: 4 });
type Limits = typeof PRECISION_VIDEO_LIMITS;
export interface PrecisionCrop {
  id: string; frameIndex: number; pts: string; timeBase: string; timestampSec: number;
  sourceFramePath: string; sourceFrameSha256: string; cropPath: string; cropSha256: string;
  box: { left: number; top: number; width: number; height: number };
  reason: "changed_region" | "coverage_anchor";
  recognition: "not_requested" | "submitted";
  resourceIdentity: "unverified";
}
export interface PrecisionVideoManifest {
  version: 1; policyVersion: string; sourceSha256: string; sourceBytes: number;
  width: number; height: number; timeBase: string; timelineOriginSec: number; durationSeconds: number;
  status: "running" | "complete" | "partial" | "cancelled" | "failed";
  stopReason?: string; limits: Limits; elapsedMs: number;
  thresholds: typeof PRECISION_VIDEO_THRESHOLDS;
  decodedFrames: number; candidateFrames: number; skippedCandidates: number; motionFrames: number;
  artifactBytes: number; cropBytes: number; maxResidentSourceFrames: 2;
  crops: PrecisionCrop[];
  coverage: { decoderReachedEnd: boolean; firstTimestampSec: number | null; lastTimestampSec: number | null;
    largestFrameGapSec: number; unscannedRanges: Array<{ startSec: number; endSec: number }>; semanticCoverage: "partial" };
  limitations: string[];
}
export interface PrecisionVideoOptions {
  videoPath: string; outputDirectory: string; durationSeconds: number; signal?: AbortSignal;
  /** Overrides may only lower the production ceilings, including in deterministic tests. */
  limits?: Partial<Limits>;
  onCheckpoint?: (manifest: PrecisionVideoManifest) => Promise<void>;
}
export class PrecisionVideoError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "PrecisionVideoError"; }
}
const failure = (code: string) => new PrecisionVideoError(code, "Local detail scan could not finish; screen-detail coverage is partial.");
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Full-resolution, regional differences: small changes are never averaged into a global thumbnail. */
export function discoverPrecisionRegion(rgb: Buffer, previous: Buffer | undefined, width: number, height: number) {
  const { tileSize, channelDelta, edgeDelta, minChangedPixels, minEdgePixels } = PRECISION_VIDEO_THRESHOLDS;
  const columns = Math.ceil(width / tileSize), rows = Math.ceil(height / tileSize);
  const tiles = Array.from({ length: columns * rows }, () => ({ changed: 0, edges: 0, left: width, top: height, right: -1, bottom: -1 }));
  let totalChanged = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 3;
    const changed = !previous || Math.abs(rgb[p] - previous[p]) >= channelDelta || Math.abs(rgb[p + 1] - previous[p + 1]) >= channelDelta || Math.abs(rgb[p + 2] - previous[p + 2]) >= channelDelta;
    if (!changed) continue;
    totalChanged++;
    const tile = tiles[Math.floor(y / tileSize) * columns + Math.floor(x / tileSize)];
    tile.changed++;
    // Edges are only candidate cues; no claim that they contain text is made.
    const edge = (x > 0 && (Math.abs(rgb[p] - rgb[p - 3]) >= edgeDelta || Math.abs(rgb[p + 1] - rgb[p - 2]) >= edgeDelta || Math.abs(rgb[p + 2] - rgb[p - 1]) >= edgeDelta)) ||
      (y > 0 && (Math.abs(rgb[p] - rgb[p - width * 3]) >= edgeDelta || Math.abs(rgb[p + 1] - rgb[p + 1 - width * 3]) >= edgeDelta || Math.abs(rgb[p + 2] - rgb[p + 2 - width * 3]) >= edgeDelta));
    if (edge) tile.edges++;
    tile.left = Math.min(tile.left, x); tile.right = Math.max(tile.right, x);
    tile.top = Math.min(tile.top, y); tile.bottom = Math.max(tile.bottom, y);
  }
  const active = tiles.map(t => t.changed >= minChangedPixels && t.edges >= minEdgePixels);
  let best = -1;
  tiles.forEach((tile, i) => { if (active[i] && (best < 0 || tile.edges > tiles[best].edges)) best = i; });
  if (best < 0) return { box: undefined, score: 0, motion: Boolean(previous && totalChanged > width * height / 2) };
  // Connect neighboring active tiles so a long address stays together. Only the strongest region wins.
  const connected = new Set([best]), queue = [best];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor], x = index % columns, y = Math.floor(index / columns);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const next = ny * columns + nx;
      if (nx >= 0 && nx < columns && ny >= 0 && ny < rows && active[next] && !connected.has(next)) { connected.add(next); queue.push(next); }
    }
  }
  const selected = [...connected].map(i => tiles[i]);
  const left = Math.max(0, Math.min(...selected.map(t => t.left)) - 24), top = Math.max(0, Math.min(...selected.map(t => t.top)) - 24);
  const strongest = tiles[best];
  return { box: { left, top, width: Math.min(width, Math.max(...selected.map(t => t.right)) + 25) - left,
    height: Math.min(height, Math.max(...selected.map(t => t.bottom)) + 25) - top },
    focus: { x: (strongest.left + strongest.right) / 2, y: (strongest.top + strongest.bottom) / 2 },
    score: selected.reduce((sum, tile) => sum + tile.edges, 0), motion: Boolean(previous && totalChanged > width * height / 2) };
}

function boundedBox(box: PrecisionCrop["box"], maxPixels: number, focus = { x: box.left + box.width / 2, y: box.top + box.height / 2 }): PrecisionCrop["box"] {
  if (box.width * box.height <= maxPixels) return box;
  // Preserve pixels without downscaling; a large region is explicitly only partially cropped.
  const ratio = Math.sqrt(maxPixels / (box.width * box.height));
  const width = Math.max(1, Math.floor(box.width * ratio)), height = Math.max(1, Math.floor(box.height * ratio));
  return { left: Math.max(box.left, Math.min(box.left + box.width - width, Math.round(focus.x - width / 2))),
    top: Math.max(box.top, Math.min(box.top + box.height - height, Math.round(focus.y - height / 2))), width, height };
}

/** Decode once with backpressure; keep only previous/current RGB frames and capped PNG artifacts. No reseeks. */
export async function scanPrecisionVideo(options: PrecisionVideoOptions): Promise<PrecisionVideoManifest> {
  options.signal?.throwIfAborted();
  validateVideoDuration(options.durationSeconds);
  const limits = { ...PRECISION_VIDEO_LIMITS, ...options.limits };
  for (const key of Object.keys(limits) as Array<keyof Limits>) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] <= 0 || limits[key] > PRECISION_VIDEO_LIMITS[key]) throw failure("INVALID_PRECISION_BUDGET");
  }
  const started = Date.now();
  const deadline = AbortSignal.timeout(limits.maxScanMs);
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
  const stat = await fs.stat(options.videoPath);
  if (!stat.isFile() || stat.size <= 0 || stat.size > 100 * 1_024 * 1_024) throw failure("INVALID_PRECISION_SOURCE");
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(options.videoPath, { signal })) hash.update(chunk);
  let probe;
  try {
    const { stdout } = await execFileAsync(ffprobePath.path, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,time_base:format=start_time", "-of", "json", options.videoPath], { signal, timeout: Math.min(limits.maxScanMs, 15_000), maxBuffer: 128 * 1_024 });
    probe = JSON.parse(stdout);
  } catch { signal.throwIfAborted(); throw failure("PRECISION_PROBE_FAILED"); }
  const { width, height, time_base: timeBase } = probe.streams?.[0] || {};
  const timelineOriginSec = Number(probe.format?.start_time ?? 0);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 || width * height > limits.maxSourcePixels || !/^\d+\/[1-9]\d*$/.test(timeBase || "") || !Number.isFinite(timelineOriginSec)) throw failure("PRECISION_SOURCE_UNSUPPORTED");
  await fs.mkdir(options.outputDirectory, { recursive: true, mode: 0o700 });
  const directory = await fs.mkdtemp(path.join(options.outputDirectory, "precision-"));
  const manifest: PrecisionVideoManifest = {
    version: 1, policyVersion: PRECISION_VIDEO_POLICY, sourceSha256: hash.digest("hex"), sourceBytes: stat.size,
    width, height, timeBase, timelineOriginSec, durationSeconds: options.durationSeconds, status: "running", limits, thresholds: PRECISION_VIDEO_THRESHOLDS, elapsedMs: 0,
    decodedFrames: 0, candidateFrames: 0, skippedCandidates: 0, motionFrames: 0, artifactBytes: 0, cropBytes: 0, maxResidentSourceFrames: 2, crops: [],
    coverage: { decoderReachedEnd: false, firstTimestampSec: null, lastTimestampSec: null, largestFrameGapSec: 0, unscannedRanges: [{ startSec: 0, endSec: options.durationSeconds }], semanticCoverage: "partial" },
    limitations: [
      "Full-resolution regional change/edge thresholds locate candidates, not all text. Low-contrast, unchanged, tiny or brief details can be missed; no OCR or resource identity verification occurs locally.",
      "At most one strongest region per candidate frame is cropped without rescaling. Large regions can be clipped; saved full source frames retain the available decoded RGB pixels. Color conversion to RGB is not the original compressed video bitstream.",
      "Temporal buckets reserve anchors and keep stronger change candidates in separate time windows. Moving backgrounds can still outrank useful details; skipped candidates and unfinished scan ranges remain uninspected.",
      "Each crop has a reserved byte allowance so earlier images cannot consume later screen-detail slots. Oversized regions are cropped more tightly around an edge cue without rescaling; the saved full frame retains the surrounding context.",
      "Coverage anchors are an uncertainty fallback, not evidence that intervening content was understood. Every-frame decoding never means every-frame semantic inspection.",
    ],
  };
  const checkpoint = async () => {
    manifest.elapsedMs = Date.now() - started;
    manifest.coverage.unscannedRanges = manifest.coverage.decoderReachedEnd ? [] : [{ startSec: manifest.coverage.lastTimestampSec ?? 0, endSec: options.durationSeconds }];
    await options.onCheckpoint?.(structuredClone(manifest));
  };
  await checkpoint();
  signal.throwIfAborted();
  if (!ffmpegPath) throw failure("PRECISION_DECODER_UNAVAILABLE");
  const child = spawn(ffmpegPath, ["-hide_banner", "-nostdin", "-nostats", "-loglevel", "info", "-threads", "1", "-filter_threads", "1", "-copyts", "-noautorotate", "-i", options.videoPath,
    "-map", "0:v:0", "-an", "-sn", "-dn", "-vf", "format=rgb24,showinfo", "-vsync", "0", "-threads", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"], { stdio: ["ignore", "pipe", "pipe"] });
  let stopped: string | undefined, closed = false, exitCode: number | null = null, stderr = "", wake: (() => void) | undefined;
  let decodeTimeBase = timeBase;
  const timestamps: Array<{ index: number; pts: string; timeBase: string }> = [];
  const stop = (reason: string) => { stopped ??= reason; child.kill("SIGKILL"); wake?.(); };
  const abort = () => stop(options.signal?.aborted ? "cancelled" : "time_budget");
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const done = new Promise<void>(resolve => {
    child.once("error", () => stop("decode_failed"));
    child.once("close", code => { closed = true; exitCode = code; wake?.(); resolve(); });
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
    if (stderr.length > 64 * 1_024) { stop("decoder_metadata_limit"); stderr = ""; return; }
    let newline;
    while ((newline = stderr.indexOf("\n")) >= 0) {
      const line = stderr.slice(0, newline); stderr = stderr.slice(newline + 1);
      const base = line.match(/config in time_base: (\d+\/[1-9]\d*)/);
      if (base) decodeTimeBase = base[1];
      const frame = line.match(/\bn:\s*(\d+)\s+pts:\s*(-?\d+)\s+pts_time:/);
      if (frame) { timestamps.push({ index: Number(frame[1]), pts: frame[2], timeBase: decodeTimeBase }); if (timestamps.length > 128) stop("decoder_metadata_limit"); wake?.(); }
      // Never retain raw stderr: it can contain source paths or arbitrary metadata.
      if (/corrupt|error while decoding|invalid data found/i.test(line)) stop("decode_failed");
    }
  });
  const buckets = Math.max(1, Math.floor(limits.maxCrops / 3));
  const used = Array.from({ length: buckets }, () => ({ anchor: false, changes: [null, null] as Array<{ index: number; score: number; sourceBytes: number; cropBytes: number } | null> }));
  const bytesPerFrame = width * height * 3;
  let current: Buffer = Buffer.allocUnsafe(bytesPerFrame), previous: Buffer | undefined, offset = 0, lastCheckpoint = Date.now(), artifactRetryAt = -1;
  try {
    decode: for await (const raw of child.stdout) {
      const chunk = raw as Buffer;
      for (let pos = 0; pos < chunk.length;) {
        if (stopped) break decode;
        const size = Math.min(chunk.length - pos, bytesPerFrame - offset);
        chunk.copy(current, offset, pos, pos + size); offset += size; pos += size;
        if (offset !== bytesPerFrame) continue;
        while (!timestamps.length && !closed && !stopped) await new Promise<void>(resolve => { wake = resolve; });
        wake = undefined;
        if (stopped) break decode;
        const info = timestamps.shift();
        if (!info || info.index !== manifest.decodedFrames || !Number.isSafeInteger(Number(info.pts))) { stop("timestamp_mismatch"); break decode; }
        const [num, den] = info.timeBase.split("/").map(Number);
        const timestampSec = Number(info.pts) * num / den - timelineOriginSec;
        const last = manifest.coverage.lastTimestampSec;
        if (!Number.isFinite(timestampSec) || timestampSec < 0 || timestampSec > options.durationSeconds || (last !== null && timestampSec <= last)) { stop("timestamp_mismatch"); break decode; }
        manifest.timeBase = info.timeBase;
        manifest.coverage.firstTimestampSec ??= timestampSec;
        if (last !== null) manifest.coverage.largestFrameGapSec = Math.max(manifest.coverage.largestFrameGapSec, timestampSec - last);
        manifest.coverage.lastTimestampSec = timestampSec;
        const region = discoverPrecisionRegion(current, previous, width, height);
        if (region.motion) manifest.motionFrames++;
        if (region.box) manifest.candidateFrames++;
        const position = timestampSec / options.durationSeconds * buckets;
        const bucket = used[Math.min(buckets - 1, Math.floor(position))];
        const slot = Math.min(1, Math.floor((position % 1) * 2));
        const prior = bucket.changes[slot];
        const reason = timestampSec < artifactRetryAt ? undefined : !bucket.anchor ? "coverage_anchor" : region.box && (!prior || region.score > prior.score * 1.25) ? "changed_region" : undefined;
        const replacement = reason === "changed_region" ? prior : null;
        if (reason && (replacement || manifest.crops.length < limits.maxCrops)) {
          let box = boundedBox(region.box || { left: 0, top: 0, width, height }, limits.maxCropPixels, region.focus);
          const source = await sharp(current, { raw: { width, height, channels: 3 } }).png().toBuffer();
          let crop = await sharp(current, { raw: { width, height, channels: 3 } }).extract(box).png().toBuffer();
          // Reserve one additional slot for a replacement while keeping the
          // existing evidence on disk until its successor is safely written.
          const cropAllowance = Math.floor(limits.maxCropBytes / (limits.maxCrops + 1));
          for (let attempt = 0; crop.length > cropAllowance && attempt < 5 && box.width > 16 && box.height > 16; attempt++) {
            signal.throwIfAborted();
            const ratio = Math.min(0.75, cropAllowance / crop.length * 0.85);
            box = boundedBox(box, Math.max(1, Math.floor(box.width * box.height * ratio)), region.focus);
            crop = await sharp(current, { raw: { width, height, channels: 3 } }).extract(box).png().toBuffer();
          }
          // Budget the temporary replacement too; never exceed the disk ceiling while swapping.
          if (crop.length <= cropAllowance && source.length + crop.length <= Math.floor(limits.maxArtifactBytes / (limits.maxCrops + 1)) && manifest.artifactBytes + source.length + crop.length <= limits.maxArtifactBytes && manifest.cropBytes + crop.length <= limits.maxCropBytes) {
            const id = `frame-${info.index}`, sourceFramePath = path.join(directory, `${id}.png`), cropPath = path.join(directory, `${id}-crop.png`);
            signal.throwIfAborted();
            try { await fs.writeFile(sourceFramePath, source, { mode: 0o600, flag: "wx" }); await fs.writeFile(cropPath, crop, { mode: 0o600, flag: "wx" }); }
            catch (error) { await fs.rm(sourceFramePath, { force: true }); await fs.rm(cropPath, { force: true }); throw error; }
            const record: PrecisionCrop = { id, frameIndex: info.index, pts: info.pts, timeBase: info.timeBase, timestampSec, box, sourceFramePath, cropPath,
              sourceFrameSha256: sha256(source), cropSha256: sha256(crop), reason, recognition: "not_requested", resourceIdentity: "unverified" };
            const index = replacement?.index ?? manifest.crops.length;
            if (replacement) {
              const old = manifest.crops[index];
              await fs.rm(old.sourceFramePath); await fs.rm(old.cropPath);
              manifest.artifactBytes -= replacement.sourceBytes + replacement.cropBytes;
              manifest.cropBytes -= replacement.cropBytes;
              manifest.crops[index] = record;
            } else manifest.crops.push(record);
            manifest.artifactBytes += source.length + crop.length; manifest.cropBytes += crop.length;
            if (reason === "coverage_anchor") bucket.anchor = true;
            else bucket.changes[slot] = { index, score: region.score, sourceBytes: source.length, cropBytes: crop.length };
          } else {
            manifest.skippedCandidates++;
            if (!manifest.crops.length) stop("artifact_budget");
            else {
              // A costly frame must not prevent examining the rest of the timeline.
              artifactRetryAt = timestampSec + 1;
              const limit = "Some candidate crops exceeded the artifact budget and were skipped. Saved details remain partial.";
              if (!manifest.limitations.includes(limit)) manifest.limitations.push(limit);
            }
          }
        } else if (region.box) manifest.skippedCandidates++;
        manifest.decodedFrames++;
        if (Date.now() - lastCheckpoint > 1_000 || reason) { await checkpoint(); lastCheckpoint = Date.now(); }
        // Reuse two buffers; async iteration supplies pipe backpressure during crop work.
        const reusable = previous; previous = current; current = reusable ?? Buffer.allocUnsafe(bytesPerFrame); offset = 0;
        if (manifest.decodedFrames >= limits.maxFrames) { stop("frame_budget"); break decode; }
      }
    }
    await done;
    if (!stopped && (exitCode !== 0 || offset !== 0 || timestamps.length !== 0 || !manifest.decodedFrames)) stopped = "decode_failed";
    manifest.coverage.decoderReachedEnd = !stopped;
  } catch (error) {
    stop(signal.aborted ? options.signal?.aborted ? "cancelled" : "time_budget" : "scan_failed");
    if (!signal.aborted) manifest.limitations.push("The local scan failed; only artifacts checkpointed before failure are available.");
  } finally {
    child.kill("SIGKILL"); await done; signal.removeEventListener("abort", abort);
    manifest.stopReason = stopped;
    manifest.status = stopped === "cancelled" ? "cancelled" : stopped ? manifest.decodedFrames ? "partial" : "failed" : "complete";
    if (stopped) manifest.limitations.push(`Local scanning stopped: ${stopped}. Remaining source details were not checked.`);
    await checkpoint();
  }
  options.signal?.throwIfAborted();
  return manifest;
}
