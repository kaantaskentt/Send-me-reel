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
import { resolveYtDlpExecutable, ANALYSIS_VIDEO_FORMAT, ANALYSIS_VIDEO_SORT, validateAnalysisVideoSize } from "../src/services/mediaRuntime.js";
import { ytDlpMetadataArgs, parseYtDlpMetadata, YTDLP_METADATA_MAX_BYTES } from "../src/services/ytDlpMetadata.js";
import { captureDownloadedVideo } from "../src/services/precisionVideoCapture.js";
import { GEMINI_VIDEO_MODEL, GeminiVideoError, type GeminiVideoManifest } from "../src/services/geminiVideo.js";

const execFileAsync = promisify(execFile);
const HELP = `Usage: npx tsx scripts/analyze-video.ts URL [--output .contextdrop/local-analysis.json] [--timeout-seconds 720] [--note "What to understand"] [--reader auto|gemini|openai]\n\nDownloaded videos are limited to 10 minutes. Auto uses configured GEMINI_API_KEY or GOOGLE_API_KEY for audio/video plus bounded exact screen crops. Without Gemini, it uses the explicit sampled-frame/Whisper OpenAI fallback. --reader openai selects that fallback directly. A failed Gemini request is checkpointed, never silently retried through a second paid provider. No database or execution configuration is required.`;

function options(argv: string[]) {
  if (argv.includes("--help") || argv.includes("-h")) return null;
  const url = argv[0];
  if (!url || !parseSourceUrl(url)) throw new Error("Supply a valid public HTTP(S) source URL.");
  let output = path.resolve(".contextdrop/local-analysis.json");
  let timeoutSeconds = 720;
  let note = "";
  let reader: "auto" | "gemini" | "openai" = "auto";
  for (let i = 1; i < argv.length; i += 2) {
    if (!argv[i + 1]) throw new Error(`Missing value for ${argv[i]}`);
    if (argv[i] === "--output") output = path.resolve(argv[i + 1]);
    else if (argv[i] === "--timeout-seconds") timeoutSeconds = Number(argv[i + 1]);
    else if (argv[i] === "--note") note = argv[i + 1];
    else if (argv[i] === "--reader" && ["auto", "gemini", "openai"].includes(argv[i + 1])) reader = argv[i + 1] as typeof reader;
    else throw new Error(`Unknown option ${argv[i]}`);
  }
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 30 || timeoutSeconds > 900) throw new Error("Timeout must be between 30 and 900 seconds.");
  if (note.length > 2_000) throw new Error("Video question must be at most 2000 characters.");
  return { url, output, timeoutSeconds, note, reader };
}

function safeError(error: unknown): string {
  const detail = error && typeof error === "object" && "stderr" in error
    ? "Local media command failed; source evidence is incomplete."
    : error instanceof Error ? error.message : String(error);
  return detail
    .replace(/(?:sk-|apify_api_)[^\s"'<>]+/g, "[redacted]")
    .replace(/AIza[\w-]+|Bearer\s+[^\s"'<>]+/gi, "[redacted]")
    .replace(/https?:\/\/[^\s"'<>]+/g, "[source URL]")
    .slice(-900);
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const parsed = options(argv);
  if (!parsed) { console.log(HELP); return; }
  const input = parsed;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const reader = input.reader === "auto" ? geminiKey ? "gemini" : "openai" : input.reader;
  const model = process.env.CONTEXTDROP_GEMINI_VIDEO_MODEL || GEMINI_VIDEO_MODEL;
  const startedAt = new Date().toISOString();
  const id = randomUUID();
  const captureDirectory = path.join(path.dirname(input.output), "captures", id);
  await fs.mkdir(captureDirectory, { recursive: true, mode: 0o700 });
  await fs.chmod(path.dirname(input.output), 0o700);
  const controller = new AbortController();
  const cancel = () => controller.abort(new DOMException("Capture cancelled", "AbortError"));
  process.once("SIGTERM", cancel); process.once("SIGINT", cancel);
  const ytdlpCommand = resolveYtDlpExecutable();
  const timeout = setTimeout(() => controller.abort(new DOMException(`Capture exceeded ${input.timeoutSeconds} seconds`, "TimeoutError")), input.timeoutSeconds * 1000);
  const warnings: string[] = [];
  const stageResults: Array<{ stage: string; status: string; startedAt: string; completedAt?: string; error?: string }> = [];
  const analysis: any = {
    id, user_id: "local", source_url: input.url, platform: detectPlatform(input.url), status: "scraping",
    transcript: null, frame_descriptions: [], visual_summary: null, caption: null, title: null, verdict: null,
    verdict_intent: null, credits_charged: 0, error_message: null, action_items: null,
    created_at: startedAt, completed_at: null,
    metadata: {
      capture_mode: "local", database_writes: false, ...(input.note ? { userNote: input.note } : {}),
      source_evidence: { version: 1, media_kind: "video", warnings, provider: reader,
        models: reader === "gemini" ? { native_video: model } : { transcription: "whisper-1", frame_analysis: "gpt-5.4-mini" } },
      local_evidence: { framePaths: [], timestampsSec: [], capturedAt: startedAt, sourceUrl: input.url, captureDirectory },
      local_capture: { startedAt, timeoutSeconds: input.timeoutSeconds, stage: "metadata", stages: stageResults, reader, requestedReader: input.reader,
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY), geminiConfigured: Boolean(geminiKey), processId: process.pid, ytdlpExecutable: ytdlpCommand },
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
    if (reader === "gemini" && !geminiKey) throw new GeminiVideoError("GEMINI_NOT_CONFIGURED", "Gemini is not configured. Select --reader openai to use the existing sampled-frame fallback.");
    if (reader === "openai") warnings.push(input.reader === "openai" ? "Explicit OpenAI fallback selected: sampled frame analysis and separate Whisper transcription." : "Gemini is unavailable; using the OpenAI sampled-frame/Whisper fallback. Configure Gemini for the hybrid reader.");
    const metadata = await stage("metadata", "scraping", async () => {
      const { stdout } = await execFileAsync(ytdlpCommand, ytDlpMetadataArgs(input.url), { timeout: 60_000, maxBuffer: YTDLP_METADATA_MAX_BYTES, signal: controller.signal });
      return parseYtDlpMetadata(stdout);
    });
    analysis.title = metadata.title || null;
    analysis.caption = metadata.description || metadata.title || "";
    Object.assign(analysis.metadata, {
      id: metadata.id, title: metadata.title, authorName: metadata.uploader || metadata.channel,
      authorUsername: metadata.uploader_id || metadata.channel_id, duration: metadata.duration,
      webpage_url: metadata.webpage_url, thumbnail: metadata.thumbnail, chapters: metadata.chapters || [],
    });
    // Social extractors often omit duration. Only a known positive duration can
    // reject early; the downloaded media must still pass the actual probe below.
    const advertisedDuration = Number(metadata.duration);
    if (Number.isFinite(advertisedDuration) && advertisedDuration > 0) validateVideoDuration(advertisedDuration);
    const videoPath = path.join(captureDirectory, "video.mp4");
    await stage("download", "scraping", async () => {
      await execFileAsync(ytdlpCommand, [
        "--js-runtimes", "node", "--no-playlist", "--no-progress", "--socket-timeout", "15", "--retries", "1",
        "--max-filesize", "100M", "-f", ANALYSIS_VIDEO_FORMAT, "-S", ANALYSIS_VIDEO_SORT,
        "--merge-output-format", "mp4", ...(ffmpegPath ? ["--ffmpeg-location", ffmpegPath] : []), "-o", videoPath, "--", input.url,
      ], { timeout: 180_000, maxBuffer: 5 * 1024 * 1024, signal: controller.signal });
      const file = await fs.stat(videoPath);
      if (file.size < 1000) throw new Error("Downloaded video is empty or missing");
      validateAnalysisVideoSize(file.size);
      analysis.metadata.local_evidence.videoPath = videoPath;
      analysis.metadata.local_evidence.videoBytes = file.size;
    });
    const duration = await stage("duration_check", "scraping", async () => {
      const measured = await getVideoDuration(videoPath, controller.signal);
      validateVideoDuration(measured);
      analysis.metadata.duration = measured;
      analysis.metadata.source_evidence.duration_seconds = measured;
      return measured;
    });
    analysis.metadata.source_evidence.scrape_provider = "yt-dlp";
    analysis.metadata.source_evidence.download_provider = "yt-dlp";

    if (reader === "gemini") {
      const sourceEvidence = analysis.metadata.source_evidence;
      sourceEvidence.transcript = { status: "not_requested", timing: "none", characters: 0 };
      sourceEvidence.provider_files = { deleted: 0, cleanup_pending: 0 };
      warnings.push("Speech fields are Gemini paraphrases, not a verbatim transcript. No separate Whisper or per-frame OpenAI calls were made.");
      warnings.push("Reported provider usage covers received responses only; cancelled or lost responses may still incur provider charges.");
      const checkpoint = async (manifest: GeminiVideoManifest) => {
        sourceEvidence.native_video = manifest;
        const evidence = manifest.segments.flatMap(segment => segment.status === "complete" && segment.evidence ? [segment.evidence] : []);
        analysis.frame_descriptions = evidence.flatMap(part => part.observations);
        analysis.visual_summary = evidence.map(part => part.summary).join("\n");
        sourceEvidence.summary_source = "Gemini native audio/video and supplied exact source crop observations";
        const precision = sourceEvidence.precision_video;
        sourceEvidence.visuals = { status: manifest.status === "complete" ? "available" : evidence.length ? "partial" : manifest.status === "failed" ? "failed" : "pending",
          extracted_frames: precision?.crops.length || 0, analyzed_frames: analysis.frame_descriptions.length, failed_frames: 0,
          sampled_timestamps_seconds: analysis.frame_descriptions.map((observation: { timestampSec: number }) => observation.timestampSec),
          observation_type: "native_video_and_precision_crop_observations", precision_coverage: "partial" };
        for (const warning of [manifest.coverage.description, ...evidence.flatMap(part => part.limitations)]) if (!warnings.includes(warning)) warnings.push(warning);
        analysis.metadata.local_capture.nativeProgress = { completedSegments: evidence.length, totalSegments: manifest.segments.length };
        await save();
      };
      const result = await stage("hybrid_video_analysis", "analyzing", () => captureDownloadedVideo({ videoPath, captureId: id, sourceUrl: input.url, outputDirectory: captureDirectory, durationSeconds: duration,
        apiKey: geminiKey!, model, question: input.note, signal: controller.signal, onCheckpoint: checkpoint,
        onProviderResponse: async (response, range) => {
          await fs.writeFile(path.join(captureDirectory, `provider-${range.startSec}.json`), JSON.stringify(response), { mode: 0o600 });
        },
        onWarning: warning => { if (!warnings.includes(warning)) warnings.push(warning); },
        onPrecisionCheckpoint: async manifest => {
          sourceEvidence.precision_video = manifest;
          analysis.metadata.local_evidence.framePaths = manifest.crops.map(crop => crop.sourceFramePath);
          analysis.metadata.local_evidence.timestampsSec = manifest.crops.map(crop => crop.timestampSec);
          analysis.metadata.local_evidence.cropPaths = manifest.crops.map(crop => crop.cropPath);
          if (manifest.status !== "running") for (const warning of manifest.limitations) if (!warnings.includes(warning)) warnings.push(warning);
          await save();
        },
        onCleanup: async deleted => {
          sourceEvidence.provider_files[deleted ? "deleted" : "cleanup_pending"]++;
          if (!deleted) warnings.push("Temporary Gemini source-file deletion could not be confirmed; provider cleanup is pending.");
          await save();
        },
      }));
      controller.signal.throwIfAborted();
      if (result.native.status !== "complete") {
        warnings.push("Gemini did not complete. Select --reader openai to explicitly retry with the sampled-frame fallback; this capture did not call a second paid reader.");
        throw new GeminiVideoError(result.native.segments.find(segment => segment.errorCode)?.errorCode || "NATIVE_VIDEO_INCOMPLETE", "Gemini capture did not produce complete validated evidence; checkpoints were retained.");
      }
      analysis.status = "done";
      analysis.completed_at = new Date().toISOString();
      analysis.metadata.local_capture.stage = "complete";
      sourceEvidence.capture_complete = true;
      await save();
      console.log(JSON.stringify({ status: "done", output: input.output, provider: "gemini", duration_seconds: duration, observations: analysis.frame_descriptions.length,
        preserved_crops: result.precision?.crops.length || 0, precision_status: result.precision?.status || "unavailable", usage: result.native.usage, warnings: warnings.length, database_writes: false }));
      return;
    }

    const frames = await stage("frame_extraction", "transcribing", () => extractFrames(videoPath, duration, controller.signal));
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
    analysis.metadata.local_capture.errorCode = controller.signal.aborted ? controller.signal.reason?.name === "TimeoutError" ? "CAPTURE_TIMEOUT" : "CAPTURE_CANCELLED" : error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code.slice(0, 100) : "CAPTURE_FAILED";
    analysis.metadata.local_capture.stage = "failed";
    analysis.metadata.source_evidence.capture_complete = false;
    await save();
    console.error(JSON.stringify({ status: "failed", output: input.output, error: safeError(error), database_writes: false }));
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout); process.removeListener("SIGTERM", cancel); process.removeListener("SIGINT", cancel);
    // Keep successful originals for follow-up inspection. Failed/cancelled jobs retain only bounded evidence artifacts.
    if (analysis.status === "failed") {
      for (const entry of await fs.readdir(captureDirectory, { withFileTypes: true })) if (entry.isFile() && entry.name.startsWith("video.")) await fs.rm(path.join(captureDirectory, entry.name), { force: true });
      delete analysis.metadata.local_evidence.videoPath;
      analysis.metadata.local_evidence.sourceFileRemoved = true;
      await save();
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  });
}
