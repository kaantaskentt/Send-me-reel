import { existsSync } from "node:fs";
import path from "node:path";

/** Share the maintained downloader between local capture and the production worker. */
export function resolveYtDlpExecutable(cwd = process.cwd(), env: NodeJS.ProcessEnv = process.env): string {
  if (env.YTDLP_PATH?.trim()) return env.YTDLP_PATH;
  const local = path.resolve(cwd, ".contextdrop/media-runtime/bin/yt-dlp");
  return existsSync(local) ? local : "yt-dlp";
}

export const ANALYSIS_VIDEO_FORMAT = "bv*[vcodec^=avc1][height<=1080]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]";
