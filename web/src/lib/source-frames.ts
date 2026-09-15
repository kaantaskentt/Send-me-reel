import type { Analysis } from "./types";

/** One shared mapping for the viewer and reader: observation order is not frame order. */
export function capturedFrameIndex(analysis: Pick<Analysis, "metadata" | "frame_descriptions" | "source_url">, index: number): number | null {
  const local = analysis.metadata?.local_evidence as { framePaths?: unknown[]; timestampsSec?: unknown[]; sourceUrl?: unknown } | undefined;
  const observations = analysis.frame_descriptions ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= observations.length || index >= 96 || !Array.isArray(local?.framePaths)) return null;
  if (local.sourceUrl !== undefined && local.sourceUrl !== analysis.source_url) return null;
  let imageIndex = index;
  if (Array.isArray(local.timestampsSec) && local.timestampsSec.length) {
    const timestamp = (observations[index] as { timestampSec?: unknown } | null)?.timestampSec;
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || local.timestampsSec.length !== local.framePaths.length) return null;
    const matches = local.timestampsSec.flatMap((time, candidate) => typeof time === "number" && Number.isFinite(time) && Math.abs(time - timestamp) <= 0.001 ? [candidate] : []);
    if (matches.length !== 1) return null;
    imageIndex = matches[0];
  } else if (local.framePaths.length !== observations.length) return null;
  return typeof local.framePaths[imageIndex] === "string" ? imageIndex : null;
}

export function sourceImageMime(filename: string): "image/png" | "image/jpeg" | null {
  return /\.png$/i.test(filename) ? "image/png" : /\.jpe?g$/i.test(filename) ? "image/jpeg" : null;
}
