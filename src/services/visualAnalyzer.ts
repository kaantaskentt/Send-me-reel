import fs from "fs/promises";
import OpenAI from "openai";
import { config } from "../config.js";
import { ServiceError } from "../pipeline/types.js";
import type { FrameAnalysis } from "../pipeline/types.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

const FRAME_ANALYSIS_PROMPT = `You are analyzing a frame from a social media video. Describe ONLY what is actionable and informative:
- Any text visible on screen (titles, labels, code, URLs)
- Any software interfaces or tools being demonstrated
- Any URLs, repository names, or product names shown
- Any diagrams, data, or technical content displayed

Ignore: background, clothing, facial expressions, decorative elements.
Be concise — 1-3 sentences max.`;

const BATCH_SIZE = 4;

export async function analyzeFrames(
  framePaths: string[],
  intervalSec: number = 3,
): Promise<FrameAnalysis[]> {
  if (framePaths.length === 0) return [];

  try {
    // Process frames in batches, all batches in parallel
    const batches: string[][] = [];
    for (let i = 0; i < framePaths.length; i += BATCH_SIZE) {
      batches.push(framePaths.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await Promise.all(
      batches.map((batch, batchIdx) =>
        analyzeBatch(batch, batchIdx * BATCH_SIZE, intervalSec),
      ),
    );

    return batchResults.flat();
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError(
      "VISUAL_ANALYSIS_FAILED",
      `Failed to analyze frames: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function analyzeBatch(
  framePaths: string[],
  startIdx: number,
  intervalSec: number,
): Promise<FrameAnalysis[]> {
  // Build content array with all frames in this batch
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text" as const,
      text: `Analyze these ${framePaths.length} sequential frames from a video. For each frame, describe what's actionable/informative on screen.`,
    },
  ];

  for (let i = 0; i < framePaths.length; i++) {
    const imageData = await fs.readFile(framePaths[i]);
    const base64 = imageData.toString("base64");
    const timestamp = (startIdx + i) * intervalSec;

    content.push({
      type: "text" as const,
      text: `Frame at ${timestamp}s:`,
    });
    content.push({
      type: "image_url" as const,
      image_url: {
        url: `data:image/jpeg;base64,${base64}`,
        detail: "low" as const,
      },
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: FRAME_ANALYSIS_PROMPT },
      { role: "user", content },
    ],
    max_tokens: 500,
  });

  const text = response.choices[0]?.message?.content || "";

  // Parse response into per-frame analyses
  const results: FrameAnalysis[] = [];
  const sections = text.split(/Frame at \d+s:/i).filter(Boolean);

  for (let i = 0; i < framePaths.length; i++) {
    const timestamp = (startIdx + i) * intervalSec;
    results.push({
      timestampSec: timestamp,
      description: sections[i]?.trim() || text.trim(),
    });
  }

  return results;
}

export async function summarizeVisuals(
  frameAnalyses: FrameAnalysis[],
): Promise<string> {
  if (frameAnalyses.length === 0) return "No visual content analyzed.";

  const descriptions = frameAnalyses
    .map((f) => `[${f.timestampSec}s] ${f.description}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Summarize the visual content of this video based on frame-by-frame descriptions. Focus on: what tools/software are shown, what's being demonstrated, and what key information appears on screen. 2-3 sentences max.",
      },
      { role: "user", content: descriptions },
    ],
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content || "No visual summary available.";
}
