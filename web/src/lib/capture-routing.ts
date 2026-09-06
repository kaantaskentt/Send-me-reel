import { publicLink } from "./content-conversation";
import { canonicalYouTubeVideoUrl } from "../../../src/services/geminiVideo";
export type CaptureReader = "auto" | "detailed" | "gemini";
export function selectCaptureReader(input: unknown, reader: unknown = "auto", geminiAvailable = false) {
  const url = publicLink(typeof input === "string" ? input.trim() : input);
  if (!url) throw new Error("Paste a public HTTPS link without a login or custom port.");
  if (!["auto", "detailed", "gemini"].includes(String(reader))) throw new Error("Choose a supported content reader.");
  const host = new URL(url).hostname;
  const youtube = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(host);
  const social = youtube || /(^|\.)(instagram\.com|tiktok\.com|x\.com|twitter\.com)$/.test(host);
  if (reader === "gemini" && (!youtube || !geminiAvailable)) throw new Error(youtube ? "Connect the project's Gemini key before choosing Gemini video." : "Gemini direct video currently takes public YouTube links. Choose Automatic for this link.");
  const provider = !social ? "page" : youtube && geminiAvailable && reader !== "detailed" ? "gemini" : "detailed";
  return { url: provider === "gemini" ? canonicalYouTubeVideoUrl(url) : url, provider, script: provider === "gemini" ? "scripts/capture-gemini.ts" : provider === "page" ? "scripts/capture-page.ts" : "scripts/analyze-one.ts", timeoutSeconds: provider === "page" ? 90 : 720 } as const;
}

export function captureIsActive(analysis: { status: string; created_at: string; metadata?: Record<string, unknown> | null } | null, now = Date.now()) {
  if (!analysis || ["done", "failed"].includes(analysis.status)) return false;
  const startedAt = (analysis.metadata?.local_capture as { startedAt?: string } | undefined)?.startedAt ?? analysis.created_at;
  return now - Date.parse(startedAt) < 15 * 60_000;
}
