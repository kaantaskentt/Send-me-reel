import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";
import ffmpegPath from "ffmpeg-static";
import { config } from "../config.js";
import { ServiceError } from "../pipeline/types.js";

const execAsync = promisify(exec);
const FFMPEG = ffmpegPath || "ffmpeg";
const openai = new OpenAI({ apiKey: config.openaiApiKey });

export async function transcribe(videoPath: string): Promise<string> {
  const audioPath = videoPath.replace(/\.[^.]+$/, ".mp3");

  try {
    // Extract audio from video using ffmpeg
    await execAsync(
      `"${FFMPEG}" -i "${videoPath}" -vn -acodec libmp3lame -q:a 4 -y "${audioPath}"`,
      { timeout: 60000 },
    );

    // Check if audio file was created and has content
    const stats = fs.statSync(audioPath);
    if (stats.size === 0) {
      return ""; // Video has no audio
    }

    // Transcribe with OpenAI
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      response_format: "text",
    });

    return typeof transcription === "string"
      ? transcription
      : (transcription as unknown as { text: string }).text || "";
  } catch (err) {
    // If ffmpeg fails (no audio stream), return empty
    if (
      err instanceof Error &&
      err.message.includes("does not contain any stream")
    ) {
      return "";
    }
    throw new ServiceError(
      "TRANSCRIPTION_FAILED",
      `Failed to transcribe: ${err instanceof Error ? err.message : String(err)}`,
      true,
    );
  } finally {
    // Clean up audio file
    try {
      fs.unlinkSync(audioPath);
    } catch {
      // ignore
    }
  }
}
