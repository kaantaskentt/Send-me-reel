/** Native dependencies stay in the local worker. No OpenAI/Whisper import or automatic paid retry. */
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { withGeminiFile } from "./geminiFiles.js";
import { captureGeminiVideo, nativeVideoSource, GeminiVideoError, GEMINI_PRECISION_MAX_BYTES, type CaptureGeminiVideoOptions, type GeminiVideoManifest, type GeminiPrecisionInput } from "./geminiVideo.js";
import { scanPrecisionVideo, type PrecisionVideoManifest, type PrecisionVideoOptions } from "./precisionVideo.js";
import { validateVideoDuration } from "./frameExtractor.js";
import { validateAnalysisVideoSize } from "./mediaRuntime.js";

export interface CaptureDownloadedVideoOptions {
  videoPath: string; captureId: string; sourceUrl?: string; outputDirectory: string; durationSeconds: number;
  apiKey: string; model?: string; question?: string; signal?: AbortSignal; fetchImpl?: typeof fetch;
  onCheckpoint?: CaptureGeminiVideoOptions["onCheckpoint"];
  onProviderResponse?: CaptureGeminiVideoOptions["onProviderResponse"];
  onPrecisionCheckpoint?: PrecisionVideoOptions["onCheckpoint"];
  onCleanup?: (deleted: boolean) => Promise<void>;
  onWarning?: (warning: string) => void;
}

export async function loadPrecisionInputs(manifest: PrecisionVideoManifest, signal?: AbortSignal): Promise<GeminiPrecisionInput[]> {
  const result: GeminiPrecisionInput[] = [];
  let bytes = 0;
  for (const crop of manifest.crops) {
    signal?.throwIfAborted();
    const size = (await fs.stat(crop.cropPath)).size;
    if (size <= 0 || bytes + size > GEMINI_PRECISION_MAX_BYTES) throw new Error("Preserved precision crops exceed the request budget");
    const data = await fs.readFile(crop.cropPath, { signal });
    bytes += data.length;
    if (bytes > GEMINI_PRECISION_MAX_BYTES || createHash("sha256").update(data).digest("hex") !== crop.cropSha256) throw new Error("Preserved precision crop no longer matches its manifest");
    result.push({ id: crop.id, timestampSec: crop.timestampSec, sha256: crop.cropSha256, data: data.toString("base64") });
  }
  return result;
}

/** Upload and local scan overlap. Every exit awaits local cancellation and provider-file cleanup. */
export async function captureDownloadedVideo(options: CaptureDownloadedVideoOptions): Promise<{ native: GeminiVideoManifest; precision?: PrecisionVideoManifest }> {
  validateVideoDuration(options.durationSeconds);
  options.signal?.throwIfAborted();
  if (!options.apiKey.trim() || !/^[a-f0-9-]{36}$/.test(options.captureId)) throw new GeminiVideoError("INVALID_CAPTURE_CONFIGURATION", "A configured Gemini reader and valid capture identity are required");
  if (options.model && !/^gemini-[a-z0-9.-]{1,90}$/.test(options.model)) throw new GeminiVideoError("INVALID_MODEL", "Invalid Gemini video model identifier");
  const sourceUrl = options.sourceUrl || `contextdrop://upload/${options.captureId}`;
  nativeVideoSource(sourceUrl, { fileUri: "https://generativelanguage.googleapis.com/v1beta/files/preflight", mimeType: "video/mp4" });
  const sourceFile = await fs.stat(options.videoPath);
  if (!sourceFile.isFile() || sourceFile.size <= 0) throw new GeminiVideoError("INVALID_PRECISION_SOURCE", "Downloaded video is empty or missing");
  validateAnalysisVideoSize(sourceFile.size);
  options.signal?.throwIfAborted();
  const controller = new AbortController();
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  let precision: PrecisionVideoManifest | undefined;
  const scanning = scanPrecisionVideo({ ...options, signal, onCheckpoint: async manifest => {
    precision = manifest; await options.onPrecisionCheckpoint?.(manifest);
  } }).then(result => result, async () => {
    if (precision?.status === "running") {
      precision.status = signal.aborted ? "cancelled" : "failed";
      precision.stopReason = signal.aborted ? "cancelled" : "scan_failed";
      await options.onPrecisionCheckpoint?.(structuredClone(precision));
    }
    if (!signal.aborted) options.onWarning?.("Local screen-detail scan was unavailable. Gemini audio/video overview may miss brief or small visible details; no complete precision coverage is claimed.");
    return undefined;
  });
  try {
    const native = await withGeminiFile(options.videoPath, "video/mp4", { apiKey: options.apiKey, signal, fetchImpl: options.fetchImpl }, async file => {
      await scanning;
      signal.throwIfAborted();
      let precisionInputs: GeminiPrecisionInput[] = [];
      if (precision) {
        try { precisionInputs = await loadPrecisionInputs(precision, signal); }
        catch { signal.throwIfAborted(); options.onWarning?.("Preserved crops could not be validated for the request. Gemini received the video only; detailed screen inspection remains incomplete."); }
      }
      return captureGeminiVideo({ ...options, sourceUrl, file, signal, precisionInputs, onCheckpoint: async manifest => {
        if (precision) {
          const submitted = manifest.segments.some(segment => segment.attempts > 0);
          if (submitted) for (const crop of precision.crops) if (precisionInputs.some(input => input.id === crop.id)) crop.recognition = "submitted";
          await options.onPrecisionCheckpoint?.(structuredClone(precision));
        }
        await options.onCheckpoint?.(manifest);
      } });
    }, options.onCleanup);
    return { native, precision };
  } catch (error) {
    options.signal?.throwIfAborted();
    if (error instanceof GeminiVideoError) throw error;
    // Never trace raw transport errors, headers, upload destinations or provider error bodies.
    throw new GeminiVideoError("HYBRID_CAPTURE_FAILED", "Hybrid capture failed; available checkpoints were retained and source-file cleanup was attempted.");
  } finally {
    controller.abort();
    await scanning;
  }
}
