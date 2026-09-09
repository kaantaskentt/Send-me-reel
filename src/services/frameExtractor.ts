import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { ServiceError } from "../pipeline/types.js";

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

export const MAX_ANALYSIS_FRAMES = 96;
export const FRAME_MAX_WIDTH = 1280;
export const MAX_VIDEO_SECONDS = 600;
const EXTRACTION_TIMEOUT_MS = 90_000;

export interface ExtractedFrames {
  paths: string[];
  timestampsSec: number[];
  intervalUsed: number;
  durationSec: number;
  samplingLimited: boolean;
}

export function validateVideoDuration(duration: number): void {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new ServiceError("NO_DURATION", "Could not determine video duration");
  }
  if (duration > MAX_VIDEO_SECONDS) {
    throw new ServiceError("VIDEO_TOO_LONG", "This video is over 10 minutes. We currently support videos up to 10 minutes.");
  }
}

/** Limit work while sampling across the entire clip, rather than truncating its end. */
export function getSamplingPlan(duration: number): { intervalUsed: number; samplingLimited: boolean } {
  validateVideoDuration(duration);
  const preferredInterval = duration <= 30 ? 1 : duration <= 60 ? 2 : 3;
  const intervalUsed = Math.max(preferredInterval, duration / (MAX_ANALYSIS_FRAMES - 1));
  return { intervalUsed, samplingLimited: intervalUsed > preferredInterval };
}

export function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

export async function extractFrames(videoPath: string, knownDuration?: number): Promise<ExtractedFrames> {
  const framesDir = path.join(path.dirname(videoPath), "frames");
  await fs.mkdir(framesDir, { recursive: true });

  try {
    const durationSec = knownDuration ?? await getVideoDuration(videoPath);
    const { intervalUsed, samplingLimited } = getSamplingPlan(durationSec);
    const timestampsSec: number[] = [];
    const rawPattern = path.join(framesDir, "raw_%04d.jpg");

    // Select source frames and retain their measured presentation timestamps.
    // fps= used to invent evenly spaced timestamps for frames chosen between them.
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg(videoPath)
        .outputOptions([
          "-vf", `setpts=PTS-STARTPTS,select='isnan(prev_selected_t)+gte(t-prev_selected_t,${intervalUsed})',showinfo`,
          "-vsync", "vfr", "-frames:v", String(MAX_ANALYSIS_FRAMES), "-q:v", "2",
        ])
        .output(rawPattern)
        .on("stderr", (line: string) => {
          const match = line.match(/\bpts_time:([\d.eE+-]+)/);
          if (match) timestampsSec.push(Number(match[1]));
        })
        .on("end", () => { clearTimeout(timer); resolve(); })
        .on("error", (err) => { clearTimeout(timer); reject(err); });
      const timer = setTimeout(() => {
        command.kill("SIGKILL");
        reject(new ServiceError("FRAME_EXTRACTION_FAILED", "Frame extraction timed out", true));
      }, EXTRACTION_TIMEOUT_MS);
      command.run();
    });

    const rawFiles = (await fs.readdir(framesDir)).filter((f) => /^raw_\d+\.jpg$/.test(f)).sort();
    if (!rawFiles.length || timestampsSec.length < rawFiles.length) {
      throw new ServiceError("FRAME_EXTRACTION_FAILED", "Could not associate extracted frames with source timestamps", true);
    }

    const paths: string[] = [];
    for (const file of rawFiles) {
      const rawPath = path.join(framesDir, file);
      const resizedPath = path.join(framesDir, file.replace("raw_", "frame_"));
      await sharp(rawPath)
        .resize(FRAME_MAX_WIDTH, null, { withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toFile(resizedPath);
      paths.push(resizedPath);
      await fs.unlink(rawPath);
    }

    return { paths, timestampsSec: timestampsSec.slice(0, paths.length), intervalUsed, durationSec, samplingLimited };
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("FRAME_EXTRACTION_FAILED", `Failed to extract frames: ${err instanceof Error ? err.message : String(err)}`, true);
  }
}
