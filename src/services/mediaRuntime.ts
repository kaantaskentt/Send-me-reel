import { existsSync } from "node:fs";
import path from "node:path";
import { ServiceError } from "../pipeline/types.js";

/** Share the maintained downloader between local capture and the production worker. */
export function resolveYtDlpExecutable(cwd = process.cwd(), env: NodeJS.ProcessEnv = process.env): string {
  if (env.YTDLP_PATH?.trim()) return env.YTDLP_PATH;
  const local = path.resolve(cwd, ".contextdrop/media-runtime/bin/yt-dlp");
  return existsSync(local) ? local : "yt-dlp";
}

// Prefer a video with audio, merging a separate audio stream when necessary.
// Silent videos and social formats with incomplete metadata remain readable.
export const ANALYSIS_VIDEO_FORMAT = "bv*+ba/b/bv*";
// res uses the shorter edge, so 1080x1920 Reels are not rejected as oversized.
// A preference (rather than a hard filter) also permits unknown dimensions.
export const ANALYSIS_VIDEO_SORT = "res:1080,codec:h264";
export const MAX_ANALYSIS_VIDEO_BYTES = 100 * 1024 * 1024;

/** yt-dlp limits individual downloads, not necessarily the final merged file. */
export function validateAnalysisVideoSize(bytes: number): void {
  if (bytes > MAX_ANALYSIS_VIDEO_BYTES) throw new ServiceError("VIDEO_TOO_LARGE", "Downloaded video exceeds the 100 MiB analysis limit. Choose a smaller video or upload a compressed copy.");
}
