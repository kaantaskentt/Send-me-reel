/** Additive local YouTube capture. No database writes, downloads, execution or external tool calls. */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { canonicalYouTubeVideoUrl, captureGeminiVideo, GEMINI_VIDEO_MODEL, GeminiVideoError, geminiVideoErrorCode, planGeminiVideoSegments, type GeminiVideoManifest } from "../src/services/geminiVideo.js";
import { resolveYtDlpExecutable } from "../src/services/mediaRuntime.js";
import { ytDlpMetadataArgs, parseYtDlpMetadata, YTDLP_METADATA_MAX_BYTES } from "../src/services/ytDlpMetadata.js";

const execFileAsync = promisify(execFile);
const HELP = "Usage: npx tsx scripts/capture-gemini.ts YOUTUBE_URL [--output .contextdrop/local-analysis.json] [--timeout-seconds 720] [--note QUESTION] [--resume]\nNative audio/video overview using the configured project GEMINI_API_KEY. Public YouTube videos up to 60 minutes are processed in resumable ten-minute clips. This makes real model calls; no tutorial actions are executed.";

export function parseGeminiCaptureOptions(argv: string[]) {
  if (argv.includes("--help") || argv.includes("-h")) return null;
  const url = canonicalYouTubeVideoUrl(argv[0] || "");
  let output = path.resolve(".contextdrop/local-analysis.json");
  let timeoutSeconds = 720;
  let note = "";
  let resume = false;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--resume") { resume = true; continue; }
    const value = argv[++i];
    if (value === undefined) throw new Error("Missing capture option value");
    if (argv[i - 1] === "--output") output = path.resolve(value);
    else if (argv[i - 1] === "--timeout-seconds") timeoutSeconds = Number(value);
    else if (argv[i - 1] === "--note") note = value;
    else throw new Error("Unknown capture option");
  }
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 30 || timeoutSeconds > 1_800) throw new Error("Capture timeout must be 30–1800 seconds");
  if (note.length > 2_000) throw new Error("Capture question must be at most 2000 characters");
  return { url, output, timeoutSeconds, note, resume };
}

async function atomicJson(filename: string, value: unknown): Promise<void> {
  const temp = `${filename}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    await fs.rename(temp, filename);
  } finally { await fs.rm(temp, { force: true }); }
}

async function claimLock(filename: string): Promise<() => Promise<void>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const lock = await fs.open(filename, "wx", 0o600);
      try { await lock.writeFile(JSON.stringify({ processId: process.pid })); } finally { await lock.close(); }
      return () => fs.rm(filename, { force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
      try {
        const value = JSON.parse(await fs.readFile(filename, "utf8"));
        if (!Number.isInteger(value.processId) || value.processId < 1) throw new Error("Invalid lock");
        try { process.kill(value.processId, 0); }
        catch (processError) {
          if ((processError as NodeJS.ErrnoException)?.code === "ESRCH") { await fs.rm(filename); continue; }
          throw processError;
        }
      } catch { /* An unreadable lock is not permission to overwrite an active capture. */ }
      throw new GeminiVideoError("CAPTURE_ALREADY_RUNNING", "A native capture already owns this output");
    }
  }
  throw new GeminiVideoError("CAPTURE_ALREADY_RUNNING", "The capture output could not be locked");
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const input = parseGeminiCaptureOptions(argv);
  if (!input) { console.log(HELP); return; }
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const startedAt = new Date().toISOString();
  const model = process.env.CONTEXTDROP_GEMINI_VIDEO_MODEL || GEMINI_VIDEO_MODEL;
  await fs.mkdir(path.dirname(input.output), { recursive: true, mode: 0o700 });
  const release = await claimLock(`${input.output}.gemini.lock`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException("Capture timeout", "TimeoutError")), input.timeoutSeconds * 1000);
  // The existing studio consumes this envelope; the native manifest records stronger, explicit coverage semantics.
  const analysis: Record<string, any> = {
    id: randomUUID(), user_id: "local", source_url: input.url, platform: "youtube", status: "scraping",
    transcript: null, frame_descriptions: [], visual_summary: null, caption: null, title: null,
    verdict: null, verdict_intent: null, credits_charged: 0, error_message: null, action_items: null,
    created_at: startedAt, completed_at: null,
    metadata: {
      capture_mode: "local", database_writes: false, ...(input.note ? { userNote: input.note } : {}),
      source_evidence: { version: 1, media_kind: "video", provider: "gemini", warnings: [], capture_complete: false,
        models: { native_video: model }, transcript: { status: "not_requested", timing: "none", characters: 0 },
        visuals: { status: "pending", extracted_frames: 0, analyzed_frames: 0, failed_frames: 0, sampled_timestamps_seconds: [], observation_type: "native_video_model_observations" } },
      local_evidence: { framePaths: [], timestampsSec: [], capturedAt: startedAt, sourceUrl: input.url },
      local_capture: { startedAt, stage: "metadata", timeoutSeconds: input.timeoutSeconds, processId: process.pid, provider: "gemini", geminiConfigured: Boolean(apiKey), stages: [] },
    },
  };
  let canWriteOutput = !input.resume;
  try {
    let resume: unknown;
    if (input.resume) {
      const stat = await fs.stat(input.output);
      if (stat.size > 4_000_000) throw new GeminiVideoError("RESUME_MISMATCH", "Saved capture is too large");
      const prior = JSON.parse(await fs.readFile(input.output, "utf8"));
      resume = prior?.metadata?.source_evidence?.native_video;
      if (!resume || prior.source_url !== input.url || typeof prior.id !== "string") throw new GeminiVideoError("RESUME_MISMATCH", "No matching native capture is available to resume");
      // Preserve completed evidence even if metadata refresh or resume validation later fails.
      const freshCapture = analysis.metadata.local_capture;
      Object.assign(analysis, prior);
      analysis.metadata = { ...prior.metadata, source_evidence: { ...prior.metadata.source_evidence }, local_capture: freshCapture };
      analysis.status = "scraping";
      analysis.error_message = null;
      if (!input.note && typeof prior.metadata.userNote === "string") input.note = prior.metadata.userNote;
      canWriteOutput = true;
    }
    if (!apiKey) throw new GeminiVideoError("GEMINI_NOT_CONFIGURED", "Gemini is not configured in the local project");
    await atomicJson(input.output, analysis);
    console.log("[native-video] Reading source metadata; model key is configured");
    let metadata: Record<string, any>;
    try {
      const { stdout } = await execFileAsync(resolveYtDlpExecutable(), ytDlpMetadataArgs(input.url), { timeout: 60_000, maxBuffer: YTDLP_METADATA_MAX_BYTES, signal: controller.signal });
      metadata = parseYtDlpMetadata(stdout);
    } catch { throw new GeminiVideoError("METADATA_LOOKUP_FAILED", "Could not read the public source identity and duration"); }
    if (metadata.id !== new URL(input.url).searchParams.get("v")) throw new GeminiVideoError("SOURCE_IDENTITY_MISMATCH", "Retrieved source identity did not match the requested video");
    const duration = Number(metadata.duration);
    planGeminiVideoSegments(duration);
    analysis.title = metadata.title || null;
    analysis.caption = metadata.description || metadata.title || "";
    Object.assign(analysis.metadata, { title: metadata.title, id: metadata.id, authorName: metadata.uploader || metadata.channel, duration, webpage_url: input.url, thumbnail: metadata.thumbnail, chapters: metadata.chapters || [] });
    analysis.metadata.source_evidence.duration_seconds = duration;
    analysis.metadata.source_evidence.scrape_provider = "yt-dlp metadata only";
    analysis.metadata.source_evidence.download_provider = "Gemini direct public YouTube input";
    analysis.status = "analyzing";
    analysis.metadata.local_capture.stage = "native_video_analysis";
    await atomicJson(input.output, analysis);
    const onCheckpoint = async (manifest: GeminiVideoManifest) => {
      const evidence = manifest.segments.flatMap(segment => segment.status === "complete" && segment.evidence ? [segment.evidence] : []);
      analysis.metadata.source_evidence.native_video = manifest;
      analysis.metadata.source_evidence.capture_complete = manifest.coverage.complete;
      analysis.metadata.source_evidence.warnings = [manifest.coverage.description, "No separate verbatim transcript or local screenshot images were created. Speech fields are model paraphrases.", ...evidence.flatMap(part => part.limitations)];
      analysis.frame_descriptions = evidence.flatMap(part => part.observations);
      analysis.visual_summary = manifest.segments.filter(segment => segment.evidence).map(segment => `[${segment.startSec}–${segment.endSec}s, native audio/video summary] ${segment.evidence!.summary}`).join("\n");
      Object.assign(analysis.metadata.source_evidence.visuals, {
        status: manifest.status === "complete" ? "available" : evidence.length ? "partial" : "pending",
        analyzed_frames: analysis.frame_descriptions.length,
        sampled_timestamps_seconds: analysis.frame_descriptions.map((observation: { timestampSec: number }) => observation.timestampSec),
      });
      const current = manifest.segments.find(segment => segment.status === "running");
      analysis.metadata.local_capture.stage = "native_video_analysis";
      analysis.metadata.local_capture.nativeProgress = { completedSegments: evidence.length, totalSegments: manifest.segments.length, ...(current ? { startSec: current.startSec, endSec: current.endSec } : {}) };
      await atomicJson(input.output, analysis);
    };
    const manifest = await captureGeminiVideo({ sourceUrl: input.url, durationSeconds: duration, apiKey, model, question: input.note, resume, signal: controller.signal, onCheckpoint,
      ...(process.env.CONTEXTDROP_CAPTURE_PROVIDER_DEBUG === "1" ? { onProviderResponse: async (response: unknown, range: { startSec: number; endSec: number }) => atomicJson(`${input.output}.${range.startSec}.provider-response.json`, response) } : {}),
    });
    if (manifest.status !== "complete") {
      const failed = manifest.segments.find(segment => segment.status === "failed");
      throw new GeminiVideoError(failed?.errorCode || "NATIVE_VIDEO_INCOMPLETE", manifest.status === "partial" ? "Some video clips were analyzed; capture is incomplete. Resume to retain completed evidence." : "Native video capture did not produce validated evidence.");
    }
    analysis.status = "done";
    analysis.completed_at = new Date().toISOString();
    analysis.metadata.local_capture.stage = "complete";
    await atomicJson(input.output, analysis);
    console.log(JSON.stringify({ status: "done", source: input.url, durationSeconds: duration, segments: manifest.segments.length, observations: analysis.frame_descriptions.length, model, usage: manifest.usage, elapsedSeconds: (Date.now() - Date.parse(startedAt)) / 1000, output: input.output }));
  } catch (error) {
    analysis.status = "failed";
    const code = geminiVideoErrorCode(error);
    analysis.error_message = error instanceof GeminiVideoError ? error.message : "Native capture failed; completed evidence is retained where available.";
    analysis.metadata.local_capture.stage = "failed";
    analysis.metadata.local_capture.errorCode = code;
    analysis.metadata.source_evidence.capture_complete = false;
    if (canWriteOutput) await atomicJson(input.output, analysis);
    console.error(JSON.stringify({ status: "failed", code, output: input.output }));
    process.exitCode = 1;
  } finally { clearTimeout(timeout); await release(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(JSON.stringify({ status: "failed", code: geminiVideoErrorCode(error) })); process.exitCode = 1; });
}
