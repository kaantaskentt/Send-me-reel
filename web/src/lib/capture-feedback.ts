import type { Analysis } from "./types";

export interface CaptureFailure { code: string; message: string; retryable: boolean }

// Provider diagnostics stay in the private checkpoint. Only fixed, actionable
// messages reach the browser; errors may contain URLs, paths or credentials.
export function getCaptureFailure(analysis: Pick<Analysis, "status" | "error_message" | "metadata"> | null): CaptureFailure | undefined {
  if (analysis?.status !== "failed") return undefined;
  const capture = analysis.metadata?.local_capture as { errorCode?: string } | undefined;
  const detail = analysis.error_message ?? "";
  const code = capture?.errorCode ?? "";
  if (code === "CAPTURE_TIMEOUT" && (analysis.metadata?.source_evidence as { media_kind?: string } | undefined)?.media_kind === "article") return { code, message: "This public page took too long to respond. Try again later or use another public source.", retryable: true };
  if (code.startsWith("PAGE_")) return { code: "PAGE_CAPTURE_FAILED", message: "This public page could not be read. It may require a login, block extraction, or contain no readable text. Try the repository's main page or another public source.", retryable: true };
  if (code === "GEMINI_NOT_CONFIGURED") return { code, message: "Connect the project's Gemini key to read longer YouTube videos, or choose Saved video frames for a video under 10 minutes.", retryable: false };
  if (code === "VIDEO_DURATION_UNSUPPORTED") return { code, message: "The Gemini reader accepts public YouTube videos up to 60 minutes. Choose a shorter source.", retryable: false };
  if ((analysis.metadata?.source_evidence as { native_video?: unknown } | undefined)?.native_video) return { code: "NATIVE_VIDEO_INCOMPLETE", message: "Gemini could not finish a validated video reading. Completed sections are saved. Retry the same link with Gemini to resume; no task was started.", retryable: true };
  if (code === "VIDEO_TOO_LONG" || /over 10 minutes|up to 10 minutes/i.test(detail)) {
    const duration = Number(analysis.metadata?.duration);
    const length = Number.isFinite(duration) && duration > 600 ? `This video is ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s long.` : "This video is longer than 10 minutes.";
    return { code: "VIDEO_TOO_LONG", message: `${length} Choose a public video up to 10 minutes. No video analysis was completed.`, retryable: false };
  }
  if (/maxBuffer|metadata.*too large/i.test(detail) || code === "METADATA_TOO_LARGE" || code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") return { code: "METADATA_TOO_LARGE", message: "This video's information was too large to read. Try the link again; no video analysis was completed.", retryable: true };
  if (code === "CAPTURE_START_FAILED") return { code, message: "The video reader could not start on this Mac. Check the local setup, then try again.", retryable: true };
  if (/timeout|timed out|exceeded \d+ seconds|aborted/i.test(detail)) return { code: "CAPTURE_TIMEOUT", message: "Video capture took too long and stopped. Try again, or choose a shorter video.", retryable: true };
  if (/private video|video unavailable|not available|sign in|login required|members.only|age.restricted/i.test(detail)) return { code: "SOURCE_UNAVAILABLE", message: "This video could not be accessed. Try a public video that does not require signing in.", retryable: false };
  if (/OpenAI is not configured|missing.*api.*key/i.test(detail)) return { code: "PROVIDER_NOT_CONFIGURED", message: "Video analysis is not configured on this Mac. Connect the analysis provider before retrying.", retryable: false };
  return { code: "CAPTURE_FAILED", message: "Video capture stopped before analysis could finish. Try again, or choose another public video. No task was started.", retryable: true };
}

export function captureStageLabel(stage: string): string {
  const labels: Record<string, string> = { starting: "Starting content capture", page_capture: "Reading the public page", native_video_analysis: "Reading video sections with Gemini", metadata: "Reading video details", scraping: "Retrieving the source", download: "Downloading the video", frame_extraction: "Extracting screen images", transcribing: "Reading speech and screen images", analyzing: "Analyzing speech and screen images", transcription_and_vision: "Analyzing speech and screen images", complete: "Source capture complete" };
  return labels[stage] ?? "Analyzing the video";
}
