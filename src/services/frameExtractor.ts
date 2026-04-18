import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { ServiceError } from "../pipeline/types.js";

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

export function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

export async function extractFrames(
  videoPath: string,
  intervalSec: number = 3,
): Promise<string[]> {
  const dir = path.dirname(videoPath);
  const framesDir = path.join(dir, "frames");
  await fs.mkdir(framesDir, { recursive: true });

  try {
    const duration = await getVideoDuration(videoPath);
    if (duration === 0) {
      throw new ServiceError("NO_DURATION", "Could not determine video duration");
    }

    // Extract frames at interval using ffmpeg
    const rawPattern = path.join(framesDir, "raw_%04d.jpg");
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([`-vf fps=1/${intervalSec}`, "-q:v 2"])
        .output(rawPattern)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });

    // Read extracted frames, resize with sharp
    const files = await fs.readdir(framesDir);
    const rawFiles = files
      .filter((f) => f.startsWith("raw_"))
      .sort();

    const resizedPaths: string[] = [];
    for (const file of rawFiles) {
      const rawPath = path.join(framesDir, file);
      const resizedPath = path.join(framesDir, file.replace("raw_", "frame_"));

      await sharp(rawPath)
        .resize(512, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(resizedPath);

      resizedPaths.push(resizedPath);

      // Remove raw file
      await fs.unlink(rawPath);
    }

    return resizedPaths;
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError(
      "FRAME_EXTRACTION_FAILED",
      `Failed to extract frames: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
