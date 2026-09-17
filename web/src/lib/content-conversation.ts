import type { Analysis } from "./types";
import type { ContentGuide } from "./content-guide";

export interface ContentAction { id: string; kind: "open_url" | "prepare_task"; label: string; detail: string; url: string | null; goal: string | null; mode: "research" | "build" | "automate" | "create"; executor?: "browser" | "terminal" | "computer"; harness?: "claude" | "codex" }
export interface ContentSourceReference { analysisId: string; title: string; sourceUrl: string; evidence: number[] }
export interface ContentInspection {
  id: string; sourceUrl: string; question: string; startSec: number; endSec: number; summary: string; coverage: string;
  observations: { timestampSec: number; description: string; onScreenText: string[]; speech: string; uncertain: boolean }[];
}
export interface ContentReply { answer: string; suggestions: string[]; actions: ContentAction[]; evidence: number[]; allowedUrls?: string[]; sourceReferences?: ContentSourceReference[]; inspections?: ContentInspection[] }
export interface ContentMessage { id: string; role: "user" | "assistant"; text: string; createdAt: string; reply?: ContentReply; activity?: string[] }
export interface ContentConversation { version: 1; analysisId: string; messages: ContentMessage[]; guide?: ContentGuide }

/** A clear user instruction wins over model output and saved preferences.
 * Only parse affirmative command sentences, never the source or quoted code.
 * Ambiguous comparisons and negative requests remain for the model to interpret.
 */
export function applyRequestedHarness(reply: ContentReply, userMessage: string): ContentReply {
  const sentences = userMessage.replace(/```[\s\S]*?```/g, "").split(/[.!?\n]/);
  let harness: "codex" | "claude" | undefined;
  for (const sentence of sentences) {
    const match = sentence.trim().match(/^(?:please\s+)?(?:use|run (?:it|this) (?:in|with)|open (?:it|this) in)\s+(codex|claude(?: code)?)(?:\s+(?:for|to|and)\b.*)?$/i);
    if (match) harness = match[1].toLowerCase() === "codex" ? "codex" : "claude";
  }
  return harness ? { ...reply, actions: reply.actions.map(action => action.kind === "prepare_task" ? { ...action, executor: "terminal", harness } : action) } : reply;
}

/** Reinspection evidence is supplied by the tool runner, never invented by the reply model.
 * Validate again when reading a saved conversation and bound its follow-up context.
 */
export function parseContentInspection(value: unknown, sourceUrl: string): ContentInspection | null {
  if (!value || typeof value !== "object") return null;
  const item = value as ContentInspection;
  if (typeof item.id !== "string" || !/^[a-f0-9]{64}$/.test(item.id) || item.sourceUrl !== sourceUrl ||
      typeof item.question !== "string" || !item.question.trim() || item.question.length > 2000 ||
      !Number.isFinite(item.startSec) || !Number.isFinite(item.endSec) || item.startSec < 0 || item.endSec <= item.startSec || item.endSec - item.startSec > 30 ||
      typeof item.summary !== "string" || !item.summary.trim() || typeof item.coverage !== "string" || !Array.isArray(item.observations)) return null;
  const observations: ContentInspection["observations"] = [];
  for (const observation of item.observations.slice(0, 16)) {
    if (!observation || !Number.isFinite(observation.timestampSec) || observation.timestampSec < item.startSec || observation.timestampSec > item.endSec ||
        typeof observation.description !== "string" || !Array.isArray(observation.onScreenText) || !observation.onScreenText.every(text => typeof text === "string") ||
        typeof observation.speech !== "string" || typeof observation.uncertain !== "boolean") return null;
    observations.push({ timestampSec: observation.timestampSec, description: observation.description.slice(0, 800), onScreenText: observation.onScreenText.slice(0, 6).map(text => text.slice(0, 240)), speech: observation.speech.slice(0, 600), uncertain: observation.uncertain });
  }
  if (!observations.length) return null;
  const excerpted = item.observations.length > observations.length || item.summary.length > 3000 || item.observations.slice(0, 16).some(observation => observation.description.length > 800 || observation.speech.length > 600 || observation.onScreenText.length > 6 || observation.onScreenText.some(text => text.length > 240));
  const coverage = item.coverage.slice(0, 1000) + (excerpted ? " This saved conversation shows a bounded excerpt of the inspection; some extracted observations or text are omitted here." : "");
  return { id: item.id, sourceUrl, question: item.question, startSec: item.startSec, endSec: item.endSec, summary: item.summary.slice(0, 3000), coverage, observations };
}

export const quickTakePrompt = "Give me a quick take in 2 short sentences, under 55 words. Identify what kind of content this is and the useful ideas it actually contains, whether a video, article, image, audio, design, repository, or document. Give up to three questions of eight words or fewer specific to this content and my stated project if relevant: understand a concept, find something shown, adapt an idea, compare claims, or try a useful workflow. Do not force every source into a coding tutorial. No actions, no external search, and no plan yet. Cite relevant current-source observation indexes only; sourceReferences is empty.";

function balancedText(text: string, budget: number) {
  if (text.length <= budget) return text;
  const width = Math.floor((budget - 400) / 5);
  return Array.from({ length: 5 }, (_, i) => {
    const start = Math.round(i * (text.length - width) / 4);
    return `[Excerpt at character ${start}]\n${text.slice(start, start + width)}`;
  }).join("\n[Omitted text remains searchable with search_source]\n");
}

export function publicLink(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname.includes(".") || /(^|\.)(localhost|local|internal)$/.test(url.hostname) || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":")) return null;
    return url.href;
  } catch { return null; }
}

export function evidenceContext(analysis: Analysis) {
  const frames = (analysis.frame_descriptions ?? []).map((frame, index) => ({ ...(typeof frame === "object" && frame ? frame : { description: String(frame) }), index }));
  // Keep all available evidence for normal videos. For long videos keep a bounded,
  // evenly distributed index; individual observations remain available to inspect.
  const selected = frames.length <= 240 ? frames : Array.from({ length: 240 }, (_, i) => frames[Math.round(i * (frames.length - 1) / 239)]);
  const transcript = analysis.transcript ?? "";
  return {
    analysisId: analysis.id, sourceUrl: analysis.source_url, title: analysis.metadata?.title, durationSeconds: analysis.metadata?.duration,
    transcript: balancedText(transcript, 30_000), transcriptTruncated: transcript.length > 30_000,
    visualSummary: balancedText(analysis.visual_summary ?? "", 12_000), visualSummaryTruncated: (analysis.visual_summary?.length ?? 0) > 12_000,
    observations: selected, totalObservations: frames.length, observationIndexSampled: selected.length < frames.length,
    captureCoverage: (() => {
      const evidence = analysis.metadata?.source_evidence as { capture_complete?: boolean; media_kind?: string; warnings?: string[]; text?: unknown; document?: { pageCount?: number; completedSections?: number; totalSections?: number }; native_video?: { coverage?: unknown } } | undefined;
      return { mediaKind: evidence?.media_kind, complete: evidence?.capture_complete, warnings: evidence?.warnings, text: evidence?.text, document: evidence?.document ? { pageCount: evidence.document.pageCount, completedSections: evidence.document.completedSections, totalSections: evidence.document.totalSections } : undefined, nativeCoverage: evidence?.native_video?.coverage };
    })(),
    caption: balancedText(analysis.caption ?? "", 24_000), captionTruncated: (analysis.caption?.length ?? 0) > 24_000,
    retrieval: "The overview is a sample, not the full evidence index. Use search_source for names, claims, late details or text omitted here; use inspect_moment/inspect_frames/inspect_upload for uncertain visual details. Missing evidence is not evidence of absence.",
  };
}

export const contentReplySchema = {
  type: "object", additionalProperties: false, required: ["answer", "suggestions", "actions", "evidence", "sourceReferences"],
  properties: {
    answer: { type: "string" }, suggestions: { type: "array", items: { type: "string" } }, evidence: { type: "array", items: { type: "integer" } },
    sourceReferences: { type: "array", items: { type: "object", additionalProperties: false, required: ["analysisId", "evidence"], properties: { analysisId: { type: "string" }, evidence: { type: "array", items: { type: "integer" } } } } },
    actions: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "kind", "label", "detail", "url", "goal", "mode", "executor", "harness"], properties: {
      id: { type: "string" }, kind: { type: "string", enum: ["open_url", "prepare_task"] }, label: { type: "string" }, detail: { type: "string" },
      url: { type: ["string", "null"] }, goal: { type: ["string", "null"] }, mode: { type: "string", enum: ["research", "build", "automate", "create"] },
      executor: { type: "string", enum: ["browser", "terminal", "computer"] }, harness: { type: "string", enum: ["claude", "codex"] },
    } } },
  },
};

export function parseContentReply(raw: string, frameCount: number, allowedUrls: Set<string>, secondarySources: Map<string, Analysis> = new Map()): ContentReply {
  const value = JSON.parse(raw);
  if (!value || typeof value.answer !== "string" || !value.answer.trim() || value.answer.length > 16000 || !Array.isArray(value.suggestions) || !Array.isArray(value.actions) || !Array.isArray(value.evidence)) throw new Error("The assistant returned an incomplete reply.");
  const safe = (url: unknown) => { const parsed = publicLink(url); return parsed && allowedUrls.has(parsed) ? parsed : null; };
  // Search citations and captured literal URLs can be links. A guessed model URL
  // never becomes a clickable destination, even if it looks plausible.
  const answer = value.answer.replace(/\uE200[^\uE201]*\uE201/g, "").replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, (full: string, label: string, href: string) => safe(href) ? full : label);
  const actions: ContentAction[] = value.actions.slice(0, 4).flatMap((action: ContentAction) => {
    if (!action || !["open_url", "prepare_task"].includes(action.kind) || typeof action.label !== "string" || typeof action.detail !== "string") return [];
    const url = safe(action.url);
    if (action.kind === "open_url" && !url) return [];
    if (action.kind === "prepare_task" && (typeof action.goal !== "string" || action.goal.trim().length < 8 || action.goal.length > 1200)) return [];
    if (!["research", "build", "automate", "create"].includes(action.mode)) return [];
    const explicitHarness = /\b(claude code|codex)\b/i.test(action.goal ?? "");
    const executor = explicitHarness ? "terminal" : action.executor === "browser" || action.executor === "terminal" || action.executor === "computer" ? action.executor : action.mode === "research" ? "browser" : "terminal";
    return [{ id: crypto.randomUUID(), kind: action.kind, label: action.label.slice(0, 100), detail: action.detail.slice(0, 500), url, goal: action.kind === "prepare_task" ? action.goal : null, mode: action.mode, executor, harness: action.harness === "claude" ? "claude" : "codex" }];
  });
  const seen = new Set<string>();
  const sourceReferences: ContentSourceReference[] = (Array.isArray(value.sourceReferences) ? value.sourceReferences : []).slice(0, 8).flatMap((reference: { analysisId?: unknown; evidence?: unknown }) => {
    if (!reference || typeof reference.analysisId !== "string" || seen.has(reference.analysisId)) return [];
    const source = secondarySources.get(reference.analysisId);
    if (!source || !Array.isArray(reference.evidence)) return [];
    seen.add(reference.analysisId);
    return [{ analysisId: source.id, title: typeof source.metadata?.title === "string" ? source.metadata.title.slice(0, 200) : "Saved content", sourceUrl: source.source_url, evidence: [...new Set<number>(reference.evidence.filter((n: unknown): n is number => Number.isInteger(n) && Number(n) >= 0 && Number(n) < (source.frame_descriptions?.length ?? 0)))].slice(0, 8) }];
  });
  return { answer, actions, sourceReferences, allowedUrls: [...allowedUrls], suggestions: value.suggestions.filter((s: unknown): s is string => typeof s === "string" && s.length > 0 && s.length <= 240).slice(0, 3), evidence: [...new Set<number>(value.evidence.filter((n: unknown): n is number => Number.isInteger(n) && Number(n) >= 0 && Number(n) < frameCount))].slice(0, 8) };
}
