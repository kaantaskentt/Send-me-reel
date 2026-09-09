import { buildSourceEvidence, type ReplicationPlan } from "./execution-plan";
import type { Analysis } from "./types";
import type { WorkspaceProfile } from "./local-workspace";
import { searchSourceEvidence } from "./source-retrieval";

function boundedText(value: string, maxBytes = 2000): string {
  let bytes = 0;
  let result = "";
  for (const character of value) {
    const size = Buffer.byteLength(character);
    if (bytes + size > maxBytes) break;
    bytes += size;
    result += character;
  }
  return result;
}

function taskMatches(source: Analysis, goal: string): ReplicationPlan["evidence"] {
  if (!goal.trim()) return [];
  try {
    const terms = (goal.toLowerCase().match(/[\p{L}\p{N}_.-]+/gu) ?? []).sort((a, b) => b.length - a.length);
    return searchSourceEvidence(source, goal.slice(0, 300), 4).hits.map(hit => {
      const normalized = hit.text.toLowerCase();
      const term = terms.find(value => normalized.includes(value));
      // Keep the matching clue ahead of byte truncation in multilingual text.
      const start = term ? Math.max(0, normalized.indexOf(term) - 160) : 0;
      const offset = hit.offset + start;
      return {
        id: `match-${hit.kind}-${hit.observationIndex ?? offset}-${offset}`,
        kind: hit.kind === "observation" ? "frame" : hit.kind === "visual_summary" || (hit.kind === "caption" && source.platform === "article") ? "article" : hit.kind,
        timestampSec: hit.timestampSeconds ?? null,
        text: `Goal-matched captured ${hit.kind} excerpt${hit.observationIndex !== undefined ? `; original observation ${hit.observationIndex}` : `; character ${offset}`}. This is stored evidence, not a fresh inspection${hit.kind === "visual_summary" ? "; this overview is model-generated and fallible" : ""}.\n${hit.text.slice(start)}`,
      };
    });
  } catch { return []; }
}

/** Secondary evidence is namespaced and source-labelled before a model sees it. */
export function buildLocalTaskEvidence(primary: Analysis, others: Analysis[], profile: WorkspaceProfile, goal = "") {
  const sources = [primary, ...others.filter((source, index) => source.id !== primary.id && others.findIndex(item => item.id === source.id) === index)].slice(0, 4);
  const evidence: ReplicationPlan["evidence"] = [];
  const warnings: string[] = [];
  const budget = Math.floor(76 / sources.length);
  sources.forEach((source, sourceIndex) => {
    const captured = buildSourceEvidence(source);
    warnings.push(...captured.warnings.map(w => sources.length > 1 ? `Source ${sourceIndex + 1}: ${w}`.slice(0, 1000) : w));
    const matches = [...new Map(taskMatches(source, goal).filter(match => captured.evidence.length > 0 || !match.id.startsWith("match-visual_summary-")).map(match => {
      // If an overview already contains the matching passage, prioritize that
      // original evidence item rather than dropping it during later sampling.
      const originalFrameId = match.kind === "frame" ? `frame-${Number(match.id.split("-")[2]) + 1}` : undefined;
      const original = captured.evidence.find(item => item.kind === match.kind && (!originalFrameId || item.id === originalFrameId) && match.text.includes(item.text));
      const selected = original ?? match;
      return [selected.id, selected] as const;
    })).values()];
    const matchingFrames = new Set(matches.filter(item => item.kind === "frame").map(item => item.id.startsWith("frame-") ? Number(item.id.slice(6)) : Number(item.id.split("-")[2]) + 1));
    const matchingIds = new Set(matches.map(item => item.id));
    // Replace an overview of the same frame with the focused excerpt rather than
    // spending two planning slots on that frame. Late text remains source-bound.
    const overview = captured.evidence.filter(item => !matchingIds.has(item.id) && !matchingFrames.has(Number(item.id.replace(/^frame-/, ""))));
    const overviewBudget = budget - matches.length;
    const selection = [...matches, ...(overview.length > overviewBudget ? Array.from({ length: overviewBudget }, (_, index) => overview[Math.round(index * (overview.length - 1) / Math.max(1, overviewBudget - 1))]) : overview)];
    if (selection.length < captured.evidence.length) warnings.push(`Source ${sourceIndex + 1}: ${selection.length} of ${captured.evidence.length} planning excerpts selected across the source.`);
    for (const item of selection) evidence.push({ ...item, id: `source${sourceIndex + 1}-${item.id}`, text: boundedText(`Source ${sourceIndex + 1}: ${String(source.metadata?.title || "Saved source").slice(0, 150)}\nURL: ${source.source_url.slice(0, 300)}\n${item.text}`) });
  });
  // A profile may personalize a captured task but cannot substitute for missing
  // source evidence and bypass the route's readiness check.
  if (evidence.length && (profile.name || profile.goal || profile.preferences)) {
    const preferenceText = JSON.stringify({ project: profile.name, goal: profile.goal, preferences: profile.preferences, harness: profile.harness });
    for (let offset = 0; offset < Math.min(preferenceText.length, 5400); offset += 1800) evidence.push({ id: `user-context-${offset / 1800 + 1}`, kind: "article", timestampSec: null, text: boundedText(`User-saved project context; preferences, not demonstrated source steps or permission to access files:\n${preferenceText.slice(offset, offset + 1800)}`) });
  }
  if (sources.length > 1) warnings.unshift(`This task combines ${sources.length} saved sources. Each reference identifies its original source; combining their techniques is an inferred adaptation.`);
  return { evidence, warnings: [...new Set(warnings)].slice(0, 18) };
}
