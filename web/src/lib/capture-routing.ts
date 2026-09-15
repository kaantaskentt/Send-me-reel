import { publicLink } from "./content-conversation";
import { canonicalYouTubeVideoUrl } from "../../../src/services/geminiVideo";
export type CaptureReader = "auto" | "detailed" | "gemini" | "openai";
export function selectCaptureReader(input: unknown, reader: unknown = "auto", geminiAvailable = false) {
  const url = publicLink(typeof input === "string" ? input.trim() : input);
  if (!url) throw new Error("Paste a public HTTPS link without a login or custom port.");
  if (!["auto", "detailed", "gemini", "openai"].includes(String(reader))) throw new Error("Choose a supported content reader.");
  const host = new URL(url).hostname;
  const youtube = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(host);
  const social = youtube || /(^|\.)(instagram\.com|tiktok\.com|x\.com|twitter\.com)$/.test(host);
  if (reader === "gemini" && (!social || !geminiAvailable)) throw new Error(social ? "Connect the project's Gemini key before choosing Gemini video." : "Choose Automatic to read this page.");
  const provider = !social ? "page" : youtube && geminiAvailable && (reader === "auto" || reader === "gemini") ? "gemini" : "detailed";
  const downloadReader = provider === "detailed" ? (reader === "openai" || !geminiAvailable ? "openai" : "gemini") : undefined;
  return { url: provider === "gemini" ? canonicalYouTubeVideoUrl(url) : url, provider, downloadReader, script: provider === "gemini" ? "scripts/capture-gemini.ts" : provider === "page" ? "scripts/capture-page.ts" : "scripts/analyze-one.ts", timeoutSeconds: provider === "page" ? 90 : 720 } as const;
}

export function captureIsActive(analysis: { status: string; created_at: string; metadata?: Record<string, unknown> | null } | null, now = Date.now()) {
  if (!analysis || ["done", "failed"].includes(analysis.status)) return false;
  const capture = analysis.metadata?.local_capture as { startedAt?: string; timeoutSeconds?: number } | undefined;
  const startedAt = capture?.startedAt ?? analysis.created_at;
  const timeout = typeof capture?.timeoutSeconds === "number" && Number.isFinite(capture.timeoutSeconds) ? Math.min(1800, Math.max(840, capture.timeoutSeconds)) : 840;
  return now - Date.parse(startedAt) < (timeout + 60) * 1000;
}
