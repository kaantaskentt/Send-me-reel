import fs from "fs/promises";
import { existsSync, statSync } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { ServiceError } from "../pipeline/types.js";

const execAsync = promisify(exec);
const TMP_BASE = "/tmp/contextdrop";

const MAX_RETRIES = 2;
const RETRY_DELAY = 3000;

export async function ensureTmpDir(analysisId: string): Promise<string> {
  const dir = path.join(TMP_BASE, analysisId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Download video using yt-dlp with retry logic.
 */
export async function downloadVideo(
  url: string,
  analysisId: string,
): Promise<string> {
  const dir = await ensureTmpDir(analysisId);
  const filePath = path.join(dir, "video.mp4");
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[download] Retry ${attempt}/${MAX_RETRIES}...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }

    try {
      console.log(`[download] yt-dlp attempt ${attempt}: ${url}`);
      const { stdout, stderr } = await execAsync(
        `yt-dlp -f "best[ext=mp4]/best" -o "${filePath}" --no-warnings --no-check-certificates "${url}" 2>&1`,
        { timeout: 90000, maxBuffer: 5 * 1024 * 1024 },
      );

      if (existsSync(filePath) && statSync(filePath).size > 1000) {
        console.log(`[download] OK: ${statSync(filePath).size} bytes`);
        return filePath;
      }

      lastError = stdout || stderr || "No file produced";
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[download] Attempt ${attempt} failed:`, lastError.slice(0, 200));
    }
  }

  throw new ServiceError(
    "DOWNLOAD_FAILED",
    `Failed to download video after ${MAX_RETRIES + 1} attempts: ${lastError.slice(0, 200)}`,
    false,
  );
}

export async function cleanup(analysisId: string): Promise<void> {
  try {
    const dir = path.join(TMP_BASE, analysisId);
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Best effort cleanup
  }
}
