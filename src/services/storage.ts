import fs from "fs/promises";
import { existsSync, statSync } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { ServiceError } from "../pipeline/types.js";

const execAsync = promisify(exec);
const TMP_BASE = "/tmp/contextdrop";

export async function ensureTmpDir(analysisId: string): Promise<string> {
  const dir = path.join(TMP_BASE, analysisId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Download video using yt-dlp. Works for Instagram, TikTok, X.
 */
export async function downloadVideo(
  url: string,
  analysisId: string,
): Promise<string> {
  const dir = await ensureTmpDir(analysisId);
  const filePath = path.join(dir, "video.mp4");

  try {
    console.log(`[download] yt-dlp: ${url}`);
    await execAsync(
      `yt-dlp -f "best[ext=mp4]/best" -o "${filePath}" --no-warnings "${url}"`,
      { timeout: 60000 },
    );

    if (!existsSync(filePath) || statSync(filePath).size < 1000) {
      throw new Error("yt-dlp produced no valid output file");
    }

    console.log(`[download] OK: ${statSync(filePath).size} bytes`);
    return filePath;
  } catch (err) {
    throw new ServiceError(
      "DOWNLOAD_FAILED",
      `Failed to download video: ${err instanceof Error ? err.message : String(err)}`,
      true,
    );
  }
}

export async function cleanup(analysisId: string): Promise<void> {
  try {
    const dir = path.join(TMP_BASE, analysisId);
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Best effort cleanup
  }
}
