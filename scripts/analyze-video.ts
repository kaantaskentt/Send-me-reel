/** Local evidence capture. Does not import the database, bill credits, execute a tutorial or deploy anything. */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import ffmpegPath from "ffmpeg-static";
import { detectPlatform, parseSourceUrl } from "../src/pipeline/urlRouter.js";
import { extractFrames, getVideoDuration, validateVideoDuration, MAX_ANALYSIS_FRAMES, FRAME_MAX_WIDTH } from "../src/services/frameExtractor.js";
import { resolveYtDlpExecutable, ANALYSIS_VIDEO_FORMAT } from "../src/services/mediaRuntime.js";

const execFileAsync = promisify(execFile);
const HELP = `Usage: npx tsx scripts/analyze-one.ts URL [--output .contextdrop/local-analysis.json] [--timeout-seconds 720] [--note "What to reproduce"]\n\nCaptures public video/audio and sampled frame evidence locally. OPENAI_API_KEY enables actual transcription and frame analysis. Without it, capture remains incomplete and no model calls are made. No Supabase or Telegram configuration is required.`;

function options(argv: string[]) {
  if (argv.includes("--help") || argv.includes("-h")) return null;
  const url = argv[0];
  if (!url || !parseSourceUrl(url)) throw new Error("Supply a valid public HTTP(S) source URL.");
  let output = path.resolve(".contextdrop/local-analysis.json");
  let timeoutSeconds = 720;
  let note = "";
  for (let i = 1; i < argv.length; i += 2) {
    if (!argv[i + 1]) throw new Error(`Missing value for ${argv[i]}`);
    if (argv[i] === "--output") output = path.resolve(argv[i + 1]);
    else if (argv[i] === "--timeout-seconds") timeoutSeconds = Number(argv[i + 1]);
    else if (argv[i] === "--note") note = argv[i + 1];
    else throw new Error(`Unknown option ${argv[i]}`);
  }
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 30 || timeoutSeconds > 900) throw new Error("Timeout must be between 30 and 900 seconds.");
  return { url, output, timeoutSeconds, note };
}

function safeError(error: unknown): string {
  const detail = error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string" && error.stderr.trim()
    ? error.stderr.slice(-1400)
    : error instanceof Error ? error.message : String(error);
  return detail
    .replace(/(?:sk-|apify_api_)[^\s"'<>]+/g, "[redacted]")
    .replace(/https?:\/\/[^\s"'<>]+/g, "[source URL]")
    .slice(-900);
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const parsed = options(argv);
  if (!parsed) { console.log(HELP); return; }
  const input = parsed;
  const startedAt = new Date().toISOString();
  const id = randomUUID();
  const captureDirectory = path.join(path.dirname(input.output), "captures", id);
  await fs.mkdir(captureDirectory, { recursive: true, mode: 0o700 });
  await fs.chmod(path.dirname(input.output), 0o700);
  const controller = new AbortController();
  const ytdlpCommand = resolveYtDlpExecutable();
  const timeout = setTimeout(() => controller.abort(new Error(`Capture exceeded ${input.timeoutSeconds} seconds`)), input.timeoutSeconds * 1000);
  const warnings: string[] = [];
  const stageResults: Array<{ stage: string; status: string; startedAt: string; completedAt?: string; error?: string }> = [];
  const analysis: any = {
    id, user_id: "local", source_url: input.url, platform: detectPlatform(input.url), status: "scraping",
    transcript: null, frame_descriptions: [], visual_summary: null, caption: null, title: null, verdict: null,
    verdict_intent: null, credits_charged: 0, error_message: null, action_items: null,
    created_at: startedAt, completed_at: null,
    metadata: {
      capture_mode: "local", database_writes: false, ...(input.note ? { userNote: input.note } : {}),
      source_evidence: { version: 1, media_kind: "video", warnings, models: { transcription: "whisper-1", frame_analysis: "gpt-5.4-mini" } },
      local_evidence: { framePaths: [], timestampsSec: [], capturedAt: startedAt, sourceUrl: input.url, captureDirectory },
      local_capture: { startedAt, timeoutSeconds: input.timeoutSeconds, stage: "metadata", stages: stageResults, openaiConfigured: Boolean(process.env.OPENAI_API_KEY), processId: process.pid, ytdlpExecutable: ytdlpCommand },
    },
  };
  let saveQueue = Promise.resolve();
  function save() {
    const snapshot = JSON.stringify(analysis, null, 2) + "\n";
    saveQueue = saveQueue.catch(() => {}).then(async () => {
      const temporary = `${input.output}.tmp`;
      await fs.writeFile(temporary, snapshot, { mode: 0o600 });
      await fs.rename(temporary, input.output);
    });
    return saveQueue;
  }
  async function stage<T>(name: string, status: string, work: () => Promise<T>): Promise<T> {
    controller.signal.throwIfAborted();
    analysis.status = status;
    analysis.metadata.local_capture.stage = name;
    const record = { stage: name, status: "running", startedAt: new Date().toISOString() } as typeof stageResults[number];
    stageResults.push(record);
    await save();
    console.log(`[capture] ${name} started`);
    try {
      const value = await work();
      controller.signal.throwIfAborted();
      record.status = "complete";
      record.completedAt = new Date().toISOString();
      await save();
      console.log(`[capture] ${name} complete`);
      return value;
    } catch (error) {
      record.status = "failed";
      record.error = safeError(error);
      record.completedAt = new Date().toISOString();
      await save();
      throw error;
    }
  }
  try {
    const metadata = await stage("metadata", "scraping", async () => {
      const { stdout } = await execFileAsync(ytdlpCommand, ["--dump-single-json", "--skip-download", "--no-playlist", "--js-runtimes", "node", "--socket-timeout", "15", "--retries", "1", "--", input.url], { timeout: 60_000, maxBuffer: 10 * 1024 * 1024, signal: controller.signal });
      return JSON.parse(stdout);
    });
    validateVideoDuration(Number(metadata.duration));
    analysis.title = metadata.title || null;
    analysis.caption = metadata.description || metadata.title || "";
    Object.assign(analysis.metadata, {
      id: metadata.id, title: metadata.title, authorName: metadata.uploader || metadata.channel,
      authorUsername: metadata.uploader_id || metadata.channel_id, duration: metadata.duration,
      webpage_url: metadata.webpage_url, thumbnail: metadata.thumbnail, chapters: metadata.chapters || [],
    });
    const videoPath = path.join(captureDirectory, "video.mp4");
    await stage("download", "scraping", async () => {
      await execFileAsync(ytdlpCommand, [
        "--js-runtimes", "node", "--no-playlist", "--no-progress", "--socket-timeout", "15", "--retries", "1",
        "--max-filesize", "100M", "-f", ANALYSIS_VIDEO_FORMAT,
        "--merge-output-format", "mp4", ...(ffmpegPath ? ["--ffmpeg-location", ffmpegPath] : []), "-o", videoPath, "--", input.url,
      ], { timeout: 180_000, maxBuffer: 5 * 1024 * 1024, signal: controller.signal });
      const file = await fs.stat(videoPath);
      if (file.size < 1000) throw new Error("Downloaded video is empty or missing");
      analysis.metadata.local_evidence.videoPath = videoPath;
      analysis.metadata.local_evidence.videoBytes = file.size;
    });
    const duration = await getVideoDuration(videoPath);
    validateVideoDuration(duration);
    analysis.metadata.source_evidence.duration_seconds = duration;
    analysis.metadata.source_evidence.scrape_provider = "yt-dlp";
    analysis.metadata.source_evidence.download_provider = "yt-dlp";

    const frames = await stage("frame_extraction", "transcribing", () => extractFrames(videoPath, duration));
    analysis.metadata.local_evidence.framePaths = frames.paths;
    analysis.metadata.local_evidence.timestampsSec = frames.timestampsSec;
    analysis.metadata.source_evidence.visuals = {
      status: "extracted", extracted_frames: frames.paths.length, analyzed_frames: 0, failed_frames: 0,
      interval_seconds: frames.intervalUsed, sampled_timestamps_seconds: frames.timestampsSec,
      max_frames: MAX_ANALYSIS_FRAMES, max_width: FRAME_MAX_WIDTH,
    };
    warnings.push(`Visual evidence samples the video approximately every ${frames.intervalUsed.toFixed(2)} seconds; actions between samples may be missing.`);
    if (frames.samplingLimited) warnings.push(`Sampling was reduced to stay within ${MAX_ANALYSIS_FRAMES} frames across the complete ${duration.toFixed(2)}-second source.`);
    await save();

    if (!process.env.OPENAI_API_KEY) {
      warnings.push("OPENAI_API_KEY is unavailable. Video and frames were captured, but no transcription or model analysis occurred.");
      analysis.metadata.source_evidence.transcript = { status: "missing_key", timing: "untimed", characters: 0 };
      throw new Error("Capture incomplete: OpenAI is not configured");
    }
    const transcriber = await import("../src/services/transcriber.js");
    const visualAnalyzer = await import("../src/services/visualAnalyzer.js");
    // These calls are independent. Persist each result as soon as it completes.
    analysis.status = "analyzing";
    analysis.metadata.local_capture.stage = "transcription_and_vision";
    await save();
    console.log(`[capture] analyzing actual audio and ${frames.paths.length} source frames (maximum ${visualAnalyzer.MAX_VISION_CONCURRENCY} vision requests at once)`);
    const outcomes = await Promise.allSettled([
      transcriber.transcribe(videoPath, controller.signal).then(async (text) => {
        analysis.transcript = text || null;
        analysis.metadata.source_evidence.transcript = { status: text.trim() ? "available" : "empty", timing: "untimed", characters: text.length };
        if (text.trim()) warnings.push("Speech was transcribed without segment timestamps; precise audio/frame alignment is not available.");
        else warnings.push("No speech transcript was extracted.");
        await save();
        console.log(`[capture] actual transcript received (${text.length} characters)`);
      }),
      visualAnalyzer.analyzeFramesDetailed(frames.paths, frames.intervalUsed, frames.timestampsSec, controller.signal).then(async (result) => {
        analysis.frame_descriptions = result.frames;
        analysis.visual_summary = result.frames.map((frame) => `[${frame.timestampSec}s] ${frame.description}\nVisible text: ${frame.onScreenText.join(" | ")}`).join("\n").slice(0, 20_000);
        analysis.metadata.source_evidence.summary_source = "deterministic excerpt of model frame observations";
        Object.assign(analysis.metadata.source_evidence.visuals, {
          status: result.failedFrameCount ? result.frames.length ? "partial" : "failed" : "available",
          analyzed_frames: result.frames.length, failed_frames: result.failedFrameCount,
        });
        warnings.push(...result.warnings);
        if (result.frames.some((frame) => frame.uncertain)) warnings.push("Some sampled frame content was uncertain or unreadable; verify those details before reproducing them.");
        await save();
        console.log(`[capture] actual frame observations received (${result.frames.length}/${frames.paths.length})`);
      }),
    ]);
    for (let index = 0; index < outcomes.length; index++) {
      const outcome = outcomes[index];
      if (outcome.status === "rejected") {
        const name = index === 0 ? "transcription" : "visual_analysis";
        warnings.push(`${name} failed: ${safeError(outcome.reason)}`);
        if (index === 0) analysis.metadata.source_evidence.transcript = { status: "failed", timing: "untimed", characters: 0 };
        else analysis.metadata.source_evidence.visuals.status = "failed";
      }
    }
    controller.signal.throwIfAborted();
    if (!analysis.transcript?.trim() && analysis.frame_descriptions.length === 0) throw new Error("No actual speech or visual observations were available; source evidence is incomplete");
    analysis.status = "done";
    analysis.completed_at = new Date().toISOString();
    analysis.metadata.local_capture.stage = "complete";
    analysis.metadata.source_evidence.capture_complete = true;
    await save();
    console.log(JSON.stringify({ status: "done", output: input.output, source: input.url, title: analysis.title, duration_seconds: duration, transcript_characters: analysis.transcript?.length || 0, extracted_frames: frames.paths.length, analyzed_frames: analysis.frame_descriptions.length, warnings: warnings.length, database_writes: false }));
  } catch (error) {
    analysis.status = "failed";
    analysis.error_message = safeError(error);
    analysis.metadata.local_capture.stage = "failed";
    analysis.metadata.source_evidence.capture_complete = false;
    await save();
    console.error(JSON.stringify({ status: "failed", output: input.output, error: safeError(error), database_writes: false }));
    process.exitCode = 1;
  } finally { clearTimeout(timeout); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  });
}
