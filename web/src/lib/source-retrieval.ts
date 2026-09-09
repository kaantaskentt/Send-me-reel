import type { Analysis } from "./types";
import { listLocalLibrary, readLocalLibrarySource } from "./local-library";

export interface SourceHit {
  kind: "transcript" | "caption" | "visual_summary" | "observation";
  text: string;
  offset: number;
  observationIndex?: number;
  timestampSeconds?: number;
  score: number;
}
const STOP_WORDS = new Set("a an and are as at be by can could did do does for from had has have how i in is it me my of on or our show tell that the their them there these they this to was we what when where which who why will with would you your".split(" "));

export function sourceIdentity(analysis: Analysis) {
  return { analysisId: analysis.id, title: typeof analysis.metadata?.title === "string" ? analysis.metadata.title.slice(0, 200) : "Saved content", sourceUrl: analysis.source_url, platform: analysis.platform };
}

/** Local lexical retrieval scans all stored text, including omitted overview sections.
 * It cannot recover a detail that was never captured; visual reinspection is separate.
 */
export function searchSourceEvidence(analysis: Analysis, query: unknown, limit = 8) {
  if (typeof query !== "string" || !query.trim() || query.length > 300) throw new Error("Use a short phrase to search the source.");
  const terms = [...new Set((query.toLocaleLowerCase().match(/[\p{L}\p{N}_.-]+/gu) ?? []).filter(term => term.length > 1 && !STOP_WORDS.has(term)))].slice(0, 16);
  if (!terms.length) throw new Error("Include a name, topic, or distinctive phrase to find.");
  const maximum = Math.max(1, Math.min(8, Math.trunc(limit) || 8));
  const hits: SourceHit[] = [];
  let searchedCharacters = 0;
  let matchedPassages = 0;
  const add = (kind: SourceHit["kind"], raw: unknown, extra: Pick<SourceHit, "observationIndex" | "timestampSeconds"> = {}) => {
    if (typeof raw !== "string" || !raw) return;
    searchedCharacters += raw.length;
    // Overlapping passages preserve clues crossing a chunk boundary. Ranking is
    // across the entire source, never a prefix-only text slice.
    for (let offset = 0; offset < raw.length; offset += 1000) {
      const passage = raw.slice(offset, offset + 1200);
      const normalized = passage.toLocaleLowerCase();
      const matches = terms.filter(term => normalized.includes(term));
      if (!matches.length) continue;
      matchedPassages++;
      const phrase = normalized.includes(query.trim().toLocaleLowerCase());
      const score = matches.length / terms.length * 100 + (phrase ? 30 : 0);
      const hit = { kind, text: passage, offset, ...extra, score };
      const duplicate = hits.findIndex(item => item.kind === kind && item.observationIndex === extra.observationIndex && Math.abs(item.offset - offset) < 1100);
      if (duplicate >= 0 && hits[duplicate].score >= score) continue;
      if (duplicate >= 0) hits.splice(duplicate, 1);
      hits.push(hit);
      hits.sort((a, b) => b.score - a.score || a.offset - b.offset);
      if (hits.length > maximum) hits.length = maximum;
    }
  };
  add("transcript", analysis.transcript);
  add("caption", analysis.caption);
  add("visual_summary", analysis.visual_summary);
  const observations = analysis.frame_descriptions ?? [];
  observations.forEach((observation, observationIndex) => {
    const frame = observation && typeof observation === "object" ? observation as { timestampSec?: unknown } : null;
    const timestamp = frame?.timestampSec;
    add("observation", typeof observation === "string" ? observation : JSON.stringify(observation), { observationIndex, ...(typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp >= 0 ? { timestampSeconds: timestamp } : {}) });
  });
  return { ...sourceIdentity(analysis), query, searchedCharacters, totalObservations: observations.length, matchedPassages, resultsLimited: matchedPassages > hits.length, hits, limitation: "Search covers all stored evidence, not every original video frame. No match means the captured text did not contain these terms; it does not prove the detail was absent from the source." };
}

/** Pages cap disk reads per tool call; nextCursor makes unsearched coverage explicit. */
export async function searchSavedSources(root: string, query: unknown, cursor: unknown = 0) {
  if (!Number.isInteger(cursor) || Number(cursor) < 0 || Number(cursor) > 200) throw new Error("Use the returned library cursor.");
  // Validate before disk work even if the library is empty.
  searchSourceEvidence({ id: "validation", source_url: "", frame_descriptions: [] } as unknown as Analysis, query);
  const library = await listLocalLibrary(root);
  const start = Number(cursor);
  const page = library.items.slice(start, start + 24);
  const matches: { analysisId: string; title: string; sourceUrl: string; platform: string; hits: SourceHit[] }[] = [];
  let sourcesSearched = 0;
  for (const item of page) {
    const source = await readLocalLibrarySource(root, item.analysisId);
    if (!source) continue;
    sourcesSearched++;
    const found = searchSourceEvidence(source, query, 2);
    const titleMatches = String(query).toLocaleLowerCase().split(/\s+/).some(term => term.length > 2 && found.title.toLocaleLowerCase().includes(term));
    if (found.hits.length || titleMatches) matches.push({ ...sourceIdentity(source), hits: found.hits });
  }
  matches.sort((a, b) => (b.hits[0]?.score ?? 0) - (a.hits[0]?.score ?? 0));
  return { sourcesSearched, totalSavedSources: library.items.length, nextCursor: start + page.length < library.items.length ? start + page.length : null, matches: matches.slice(0, 8), matchesLimited: matches.length > 8, limitation: "Results are saved-source evidence, not new web findings. Read each selected source before combining it. Additional library pages have not been searched until nextCursor is exhausted." };
}
