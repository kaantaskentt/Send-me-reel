import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { searchSavedSources, searchSourceEvidence } from "../src/lib/source-retrieval";
import { readLocalLibrarySource } from "../src/lib/local-library";
import type { Analysis } from "../src/lib/types";

const source = (id: string, overrides = {}) => ({ id, status: "done", source_url: `https://example.com/${id}`, platform: "web", metadata: { title: `Source ${id}` }, transcript: null, caption: null, visual_summary: null, frame_descriptions: [], ...overrides }) as unknown as Analysis;

test("source search reaches late transcript and caption, retaining section offsets", () => {
  const analysis = source("long", { transcript: "Intro without detail. ".repeat(8000) + "Exact evening workflow uses a silverfalcon module.", caption: "Description without detail. ".repeat(4000) + "silverfalcon documentation" });
  const result = searchSourceEvidence(analysis, "silverfalcon");
  assert.ok(result.hits.some(hit => hit.kind === "transcript" && hit.offset > 100000 && hit.text.includes("silverfalcon")));
  assert.ok(result.hits.some(hit => hit.kind === "caption" && hit.offset > 60000));
  assert.equal(result.searchedCharacters, analysis.transcript!.length + analysis.caption!.length);
  assert.equal(result.sourceUrl, analysis.source_url);
});

test("source search keeps true observation indexes beyond initial overview and includes visual summary", () => {
  const analysis = source("visual", { visual_summary: "Layout uses asymmetric cobalt panels", frame_descriptions: Array.from({ length: 2300 }, (_, index) => ({ index: 4, timestampSec: index, description: index === 2299 ? "The repository is example/silverfalcon" : "Another scene" })) });
  const result = searchSourceEvidence(analysis, "silverfalcon");
  assert.equal(result.hits[0].observationIndex, 2299);
  assert.equal(result.hits[0].timestampSeconds, 2299);
  assert.equal(searchSourceEvidence(analysis, "cobalt").hits[0].kind, "visual_summary");
  assert.equal(result.totalObservations, 2300);
});

test("source retrieval remains bounded, identifies unmatched coverage and validates queries", () => {
  const analysis = source("lots", { transcript: "silverfalcon with useful facts. ".repeat(30000) });
  const result = searchSourceEvidence(analysis, "silverfalcon", 100);
  assert.ok(result.hits.length <= 8);
  assert.ok(JSON.stringify(result).length < 12000);
  assert.equal(result.resultsLimited, true);
  assert.deepEqual(searchSourceEvidence(analysis, "unfindable").hits, []);
  assert.match(result.limitation, /does not prove/);
  for (const query of [null, 5, "", "what is it", "x".repeat(301)]) assert.throws(() => searchSourceEvidence(analysis, query));
});

test("saved-source search pages evidence without changing the current source and rejects file escapes", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-source-retrieval-"));
  try {
    await fs.mkdir(path.join(root, "library"));
    const current = JSON.stringify(source("current"));
    await fs.writeFile(path.join(root, "local-analysis.json"), current);
    for (let i = 0; i < 26; i++) await fs.writeFile(path.join(root, "library", `saved-${String(i).padStart(2, "0")}.json`), JSON.stringify(source(`saved-${String(i).padStart(2, "0")}`, { caption: i === 25 ? "silverfalcon at the end of the library" : "Other information" })));
    const first = await searchSavedSources(root, "silverfalcon");
    assert.equal(first.sourcesSearched, 24);
    assert.equal(first.nextCursor, 24);
    assert.equal(first.matches.length, 0);
    const last = await searchSavedSources(root, "silverfalcon", first.nextCursor);
    assert.equal(last.nextCursor, null);
    assert.equal(last.matches[0].analysisId, "saved-25");
    assert.equal(last.matches[0].sourceUrl, "https://example.com/saved-25");
    assert.equal(await fs.readFile(path.join(root, "local-analysis.json"), "utf8"), current);
    assert.equal(await readLocalLibrarySource(root, "../local-analysis"), null);
    await fs.symlink(path.join(root, "library/saved-25.json"), path.join(root, "library/linked.json"));
    assert.equal(await readLocalLibrarySource(root, "linked"), null);
    await assert.rejects(searchSavedSources(root, "silverfalcon", -1));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
