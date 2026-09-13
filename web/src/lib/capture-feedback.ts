import type { Analysis } from "./types";

export interface CaptureFailure { code: string; message: string; retryable: boolean }

// Provider diagnostics stay in the private checkpoint. Only fixed, actionable
// messages reach the browser; errors may contain URLs, paths or credentials.
export function getCaptureFailure(analysis: Pick<Analysis, "status" | "error_message" | "metadata"> | null): CaptureFailure | undefined {
  if (analysis?.status !== "failed") return undefined;
  const capture = analysis.metadata?.local_capture as { errorCode?: string } | undefined;
  const detail = analysis.error_message ?? "";
  const code = capture?.errorCode ?? "";
  if (code === "VIDEO_TOO_LARGE") return { code, message: "This downloaded video exceeds the 100 MiB analysis limit. Choose a smaller video or upload a compressed copy. Retrying the same download will not help. No video analysis was completed.", retryable: false };
  if (analysis.metadata?.upload || code.startsWith("UPLOAD_") || code.endsWith("_UPLOAD") || code === "PDF_TOO_LONG") {
    const messages: Record<string, string> = {
      INVALID_PDF_UPLOAD: "This PDF could not be read. Choose an unencrypted PDF and upload it again.",
      PDF_TOO_LONG: "Choose a PDF with up to 100 pages, or split this document into smaller files.",
      INVALID_IMAGE_UPLOAD: "This image could not be read. Choose a PNG, JPEG, or WebP under 20 MB and 40 megapixels.",
      INVALID_MEDIA_UPLOAD: "This media file could not be read. Try an MP4 video or MP3 audio export.",
      INVALID_TEXT_UPLOAD: "This text file could not be read. Save it as UTF-8 text and upload it again.",
      VIDEO_DURATION_UNSUPPORTED: "Uploaded video and audio support up to 60 minutes. Choose a shorter file.",
      GEMINI_NOT_CONFIGURED: "Connect the project's Gemini key to read uploaded media. Text files work without it.",
    };
    return { code: Object.hasOwn(messages, code) ? code : "UPLOAD_ANALYSIS_FAILED", message: messages[code] || "The uploaded content could not be fully read. Saved sections are retained; your previous source remains in Saved content. Try the upload again.", retryable: !Object.hasOwn(messages, code) };
  }
  if (code === "CAPTURE_TIMEOUT" && (analysis.metadata?.source_evidence as { media_kind?: string } | undefined)?.media_kind === "article") return { code, message: "This public page took too long to respond. Try again later or use another public source.", retryable: true };
  if (code.startsWith("PAGE_")) return { code: "PAGE_CAPTURE_FAILED", message: "This public page could not be read. It may require a login, block extraction, or contain no readable text. Try the repository's main page or another public source.", retryable: true };
  if (code === "NOT_A_VIDEO" || /no video could be found in this tweet|(?:there is )?no video in this post|does not contain (?:a )?video|this (?:is an image post|post contains (?:an? )?(?:image|photo))/i.test(detail)) return { code: "SOURCE_HAS_NO_VIDEO", message: "This link did not expose a video. For an image or carousel, upload the images you want to discuss; for a text post, upload its text or a screenshot. The link reader does not yet import these posts automatically.", retryable: false };
  if (code === "METADATA_LOOKUP_FAILED") return { code, message: "The reader could not confirm this video's public identity and length. Try the link again, or upload a saved copy of the video. No video analysis was completed.", retryable: true };
  if (code === "ENOENT" && /yt-dlp/i.test(detail)) return { code: "DOWNLOADER_UNAVAILABLE", message: "The local video downloader is missing. Install yt-dlp on this Mac, or upload a saved video or image instead.", retryable: false };
  if (code === "GEMINI_NOT_CONFIGURED") return { code, message: "Connect the project's Gemini key to read longer YouTube videos, or choose Saved video frames for a video under 10 minutes.", retryable: false };
  if (code === "VIDEO_DURATION_UNSUPPORTED") return { code, message: "The Gemini reader accepts public YouTube videos up to 60 minutes. Choose a shorter source.", retryable: false };
  if ((analysis.metadata?.source_evidence as { native_video?: unknown } | undefined)?.native_video) return { code: "NATIVE_VIDEO_INCOMPLETE", message: "Gemini could not finish a validated video reading. Completed sections are saved. Retry the same link with Gemini to resume; no task was started.", retryable: true };
  if (code === "VIDEO_TOO_LONG" || /over 10 minutes|up to 10 minutes/i.test(detail)) {
    const duration = Number(analysis.metadata?.duration);
    const length = Number.isFinite(duration) && duration > 600 ? `This video is ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s long.` : "This video is longer than 10 minutes.";
    return { code: "VIDEO_TOO_LONG", message: `${length} This downloader accepts a public video up to 10 minutes. You can instead upload a saved video up to 60 minutes, or use Automatic for a public YouTube link with Gemini configured. No video analysis was completed.`, retryable: false };
  }
  if (/maxBuffer|metadata.*too large/i.test(detail) || code === "METADATA_TOO_LARGE" || code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") return { code: "METADATA_TOO_LARGE", message: "This video's information was too large to read. Try the link again; no video analysis was completed.", retryable: true };
  if (code === "CAPTURE_START_FAILED") return { code, message: "The video reader could not start on this Mac. Check the local setup, then try again.", retryable: true };
  if (/timeout|timed out|exceeded \d+ seconds|aborted/i.test(detail)) return { code: "CAPTURE_TIMEOUT", message: "Video capture took too long and stopped. Try again, or choose a shorter video.", retryable: true };
  if (/private video|video unavailable|not available|sign in|log.?in required|login|members.only|age.restricted|HTTP Error (?:401|403)|rate.limit/i.test(detail)) return { code: "SOURCE_UNAVAILABLE", message: "The platform did not allow this video to be retrieved. Try a public link, or upload a saved copy you can access. For image or carousel posts, upload the images instead.", retryable: false };
  if (/OpenAI is not configured|missing.*api.*key/i.test(detail)) return { code: "PROVIDER_NOT_CONFIGURED", message: "Video analysis is not configured on this Mac. Connect the analysis provider before retrying.", retryable: false };
  return { code: "CAPTURE_FAILED", message: "Video capture stopped before analysis could finish. Try again, or choose another public video. No task was started.", retryable: true };
}

export function captureStageLabel(stage: string): string {
  const labels: Record<string, string> = { starting: "Starting content capture", upload_validation: "Checking the uploaded file", upload_analysis: "Reading uploaded content", page_capture: "Reading the public page", native_video_analysis: "Reading video sections with Gemini", metadata: "Reading video details", scraping: "Retrieving the source", download: "Downloading the video", duration_check: "Checking video length", frame_extraction: "Extracting screen images", transcribing: "Reading speech and screen images", analyzing: "Analyzing speech and screen images", transcription_and_vision: "Analyzing speech and screen images", complete: "Source capture complete" };
  return labels[stage] ?? "Analyzing the video";
}
