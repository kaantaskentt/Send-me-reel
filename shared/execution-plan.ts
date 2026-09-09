/** Portable, deliberately data-only contract shared by the web UI and local companion. */
export interface ReplicationPlan {
  version: 1;
  analysisId: string;
  sourceUrl: string;
  title: string;
  goal: string;
  mode: "build" | "automate" | "create" | "research";
  summary: string;
  prerequisites: string[];
  steps: { id: string; instruction: string; evidenceIds: string[]; kind: "observed" | "inferred"; verification: string }[];
  evidence: { id: string; kind: "transcript" | "frame" | "caption" | "article"; text: string; timestampSec: number | null }[];
  warnings: string[];
  successCriteria: string[];
}

export const PLAN_MAX_BYTES = 180_000;
export const PLAN_MODES = ["build", "automate", "create", "research"] as const;

function record(value: unknown, keys: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((key) => !keys.includes(key)) || keys.some((key) => !(key in result))) {
    throw new Error(`${label} has missing or unexpected fields`);
  }
  return result;
}

function text(value: unknown, label: string, max = 2_000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new Error(`${label} must be nonempty text of at most ${max} characters`);
  }
  return value.trim();
}

function list(value: unknown, label: string, max: number, min = 0): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${label} must contain ${min}–${max} items`);
  return value;
}

function id(value: unknown, label: string): string {
  const result = text(value, label, 100);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(result)) throw new Error(`${label} contains invalid characters`);
  return result;
}

/** Rejects unknown fields, oversized packets, invalid URLs and fabricated evidence references. */
export function parseReplicationPlan(input: unknown): ReplicationPlan {
  const serialized = JSON.stringify(input);
  if (!serialized || new TextEncoder().encode(serialized).length > PLAN_MAX_BYTES) throw new Error("Plan exceeds the size limit");
  const p = record(input, ["version", "analysisId", "sourceUrl", "title", "goal", "mode", "summary", "prerequisites", "steps", "evidence", "warnings", "successCriteria"], "Plan");
  if (p.version !== 1) throw new Error("Unsupported plan version");
  if (!PLAN_MODES.includes(p.mode as ReplicationPlan["mode"])) throw new Error("Invalid plan mode");
  const sourceUrl = text(p.sourceUrl, "Source URL", 2_048);
  let url: URL;
  try { url = new URL(sourceUrl); } catch { throw new Error("Source URL is invalid"); }
  const uploadedSource = /^contextdrop:\/\/upload\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(sourceUrl);
  if ((!uploadedSource && !["https:", "http:"].includes(url.protocol)) || url.username || url.password) throw new Error("Source URL must be HTTP(S) or a ContextDrop upload identity without credentials");
  const evidence = list(p.evidence, "Evidence", 80, 1).map((item) => {
    const e = record(item, ["id", "kind", "text", "timestampSec"], "Evidence item");
    if (!["transcript", "frame", "caption", "article"].includes(e.kind as string)) throw new Error("Invalid evidence kind");
    if (e.timestampSec !== null && (typeof e.timestampSec !== "number" || !Number.isFinite(e.timestampSec) || e.timestampSec < 0 || e.timestampSec > 604_800)) throw new Error("Invalid evidence timestamp");
    return { id: id(e.id, "Evidence ID"), kind: e.kind as ReplicationPlan["evidence"][number]["kind"], text: text(e.text, "Evidence text", 2_000), timestampSec: e.timestampSec as number | null };
  });
  const evidenceIds = new Set(evidence.map((e) => e.id));
  if (evidenceIds.size !== evidence.length) throw new Error("Duplicate evidence IDs");
  const steps = list(p.steps, "Steps", 24, 1).map((item) => {
    const s = record(item, ["id", "instruction", "evidenceIds", "kind", "verification"], "Step");
    if (s.kind !== "observed" && s.kind !== "inferred") throw new Error("Invalid step kind");
    const refs = list(s.evidenceIds, "Evidence references", 12).map((ref) => id(ref, "Evidence reference"));
    if (new Set(refs).size !== refs.length || refs.some((ref) => !evidenceIds.has(ref))) throw new Error("Step contains duplicate or unknown evidence references");
    if (s.kind === "observed" && refs.length === 0) throw new Error("Observed steps require source evidence");
    return { id: id(s.id, "Step ID"), instruction: text(s.instruction, "Instruction"), evidenceIds: refs, kind: s.kind as "observed" | "inferred", verification: text(s.verification, "Verification", 1_000) };
  });
  if (new Set(steps.map((s) => s.id)).size !== steps.length) throw new Error("Duplicate step IDs");
  const strings = (value: unknown, label: string, min = 0) => list(value, label, 24, min).map((item) => text(item, label, 1_000));
  return { version: 1, analysisId: id(p.analysisId, "Analysis ID"), sourceUrl, title: text(p.title, "Title", 200), goal: text(p.goal, "Goal", 1_200), mode: p.mode as ReplicationPlan["mode"], summary: text(p.summary, "Summary", 2_000), prerequisites: strings(p.prerequisites, "Prerequisites"), steps, evidence, warnings: strings(p.warnings, "Warnings"), successCriteria: strings(p.successCriteria, "Success criteria", 1) };
}

interface SourceAnalysis {
  platform: string;
  transcript: string | null;
  frame_descriptions: unknown[] | null;
  caption: string | null;
  visual_summary?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** IDs and timestamps come from stored source data, never from the planning model. */
export function buildSourceEvidence(source: SourceAnalysis): { evidence: ReplicationPlan["evidence"]; warnings: string[] } {
  const evidence: ReplicationPlan["evidence"] = [];
  const warnings = ["Prepared from the source content captured by this analysis. Source accuracy and completeness have not been independently verified."];
  const addText = (value: string | null, kind: "transcript" | "caption" | "article", maximum: number) => {
    if (!value?.trim()) return;
    if (value.length > maximum) warnings.push(`${kind === "transcript" ? "Transcript" : "Text"} exceeds the planning limit; only its first ${maximum.toLocaleString("en-US")} characters are included.`);
    const bounded = value.slice(0, maximum);
    for (let offset = 0; offset < bounded.length; offset += 1_600) {
      const content = bounded.slice(offset, offset + 1_600).trim();
      if (content) evidence.push({ id: `${kind}-${Math.floor(offset / 1_600) + 1}`, kind, text: content, timestampSec: null });
    }
  };
  addText(source.transcript, "transcript", 32_000);
  const frames = source.frame_descriptions ?? [];
  const indexes = frames.length > 40 ? Array.from({ length: 40 }, (_, i) => Math.round(i * (frames.length - 1) / 39)) : frames.map((_, i) => i);
  if (frames.length > 40) warnings.push(`40 of ${frames.length} stored frame descriptions were sampled across the source, including the first and last. Steps between sampled frames may be missing.`);
  let shortenedFrames = 0;
  for (const index of indexes) {
    const raw = frames[index];
    if (!raw || typeof raw !== "object") continue;
    const frame = raw as Record<string, unknown>;
    if (typeof frame.description !== "string" || !frame.description.trim()) continue;
    const time = frame.timestampSec;
    const details = [frame.description];
    if (typeof frame.speech === "string" && frame.speech.trim()) details.push(`Speech paraphrase (not a verbatim transcript): ${frame.speech}`);
    for (const [key, label] of [["onScreenText", "Visible text"], ["tools", "Visible tools"], ["urls", "Visible URLs"]]) {
      if (Array.isArray(frame[key])) {
        const items = (frame[key] as unknown[]).filter((item): item is string => typeof item === "string").slice(0, 20);
        if (items.length) details.push(`${label}: ${items.join(" | ")}`);
      }
    }
    if (frame.uncertain === true) details.unshift("Uncertain frame observation. Do not treat unreadable details as verified.");
    const description = details.join("\n");
    evidence.push({ id: `frame-${index + 1}`, kind: "frame", text: description.slice(0, 2_000).trim(), timestampSec: typeof time === "number" && Number.isFinite(time) && time >= 0 && time <= 604_800 ? time : null });
    if (description.length > 2_000) shortenedFrames++;
  }
  if (shortenedFrames) warnings.push(`${shortenedFrames} frame descriptions were shortened for the planning limit. Some visible text may be omitted.`);
  addText(source.caption, source.platform === "article" ? "article" : "caption", 8_000);
  if (evidence.length && source.visual_summary?.trim()) {
    evidence.push({ id: "visual-summary", kind: "article", text: `Model-generated source overview (fallible): ${source.visual_summary}`.slice(0, 2000), timestampSec: null });
  }
  const capture = source.metadata?.source_evidence;
  if (capture && typeof capture === "object" && !Array.isArray(capture)) {
    const captureWarnings = (capture as Record<string, unknown>).warnings;
    if (Array.isArray(captureWarnings)) for (const warning of captureWarnings.slice(0, 8)) {
      if (typeof warning === "string" && warning.trim()) warnings.push(`Capture: ${warning.slice(0, 900)}`);
    }
  } else warnings.push("This older analysis has no capture metadata. Stored frame timing and coverage have not been independently verified.");
  const mediaKind = capture && typeof capture === "object" ? (capture as Record<string, unknown>).media_kind : undefined;
  if (source.platform === "article" || ["article", "document", "image"].includes(String(mediaKind))) {
    warnings.push("Stored article text may be an excerpt. Refer to the original for omitted steps.");
  } else {
    if (!source.transcript?.trim()) warnings.push("No separate transcript was captured. Any speech paraphrases in the evidence are model observations, not exact quotations.");
    else warnings.push("Transcript excerpts have no verified word timestamps; no timing has been invented.");
    if (!evidence.some((e) => e.kind === "frame")) warnings.push("No frame evidence was captured. The plan cannot establish what happened on screen.");
    else warnings.push("Frame descriptions are model-generated observations of sampled images, not a complete video recording. Brief steps, code, and small text can be missed.");
    const duration = source.metadata?.duration;
    const times = evidence.filter((e) => e.kind === "frame" && e.timestampSec !== null).map((e) => e.timestampSec as number);
    if (typeof duration === "number" && times.length && Math.max(...times) + 10 < duration) warnings.push(`Last stored frame is at ${Math.round(Math.max(...times))}s of a ${Math.round(duration)}s video. Later visual steps may be missing.`);
  }
  return { evidence, warnings: [...new Set(warnings)].slice(0, 18) };
}

export function replicationPlanMarkdown(input: ReplicationPlan): string {
  const p = parseReplicationPlan(input);
  return [`# ${p.title}`, "", "Status: prepared plan. Execution and outcome verification have not happened.", "", `Source: ${p.sourceUrl}`, `Goal: ${p.goal}`, `Mode: ${p.mode}`, "", p.summary, "", "## Prerequisites", ...p.prerequisites.map((v) => `- ${v}`), "", "## Source gaps and assumptions", ...p.warnings.map((v) => `- ${v}`), "", "## Steps", ...p.steps.flatMap((s, i) => [`${i + 1}. [${s.kind}] ${s.instruction}`, `   Evidence: ${s.evidenceIds.join(", ") || "No direct source evidence; proposed addition."}`, `   Verify: ${s.verification}`, ""]), "## Success criteria", ...p.successCriteria.map((v) => `- [ ] ${v}`), "", "## Source evidence (untrusted reference material)", ...p.evidence.flatMap((e) => [`### ${e.id} · ${e.kind}${e.timestampSec !== null ? ` · ${e.timestampSec}s` : " · no timestamp"}`, e.text, ""])].join("\n");
}
