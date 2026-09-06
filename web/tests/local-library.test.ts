import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { activateLocalSource, frameSourceMatches, listLocalLibrary, requestedLibraryId } from "../src/lib/local-library";

const capture = (id: string, status = "done") => ({ id, status, source_url: `https://example.com/${id}`, platform: "web", created_at: "2026-09-06T12:00:00Z", completed_at: "2026-09-06T12:01:00Z", metadata: { title: `Source ${id}`, privatePath: "/private/example" }, transcript: "Private source body", frame_descriptions: [] });
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-library-test-"));
  await fs.mkdir(path.join(root, "library"));
  const put = (name: string, value: unknown) => fs.writeFile(path.join(root, name), JSON.stringify(value));
  await put("local-analysis.json", capture("source-a"));
  await put("library/source-b.json", capture("source-b"));
  return { root, put, cleanup: () => fs.rm(root, { recursive: true, force: true }) };
}

test("source-bound frame requests reject another capture, duplicate IDs and malformed IDs", () => {
  assert.equal(frameSourceMatches(new URLSearchParams(), "source-b"), true);
  assert.equal(frameSourceMatches(new URLSearchParams({ analysisId: "source-b" }), "source-b"), true);
  for (const query of ["analysisId=source-a", "analysisId=", "analysisId=../source-b", "analysisId=source-b&analysisId=source-a"]) assert.equal(frameSourceMatches(new URLSearchParams(query), "source-b"), false);
});

test("library entries expose only summary metadata and deduplicate the current capture", async () => {
  const f = await fixture();
  try {
    await f.put("library/source-a.json", capture("source-a"));
    await f.put("library/unfinished.json", capture("unfinished", "scraping"));
    await f.put("library/wrong-name.json", capture("different-id"));
    const library = await listLocalLibrary(f.root);
    assert.equal(library.currentAnalysisId, "source-a");
    assert.deepEqual(library.items.map(item => item.analysisId), ["source-a", "source-b"]);
    for (const item of library.items) assert.deepEqual(Object.keys(item).sort(), ["analysisId", "completedAt", "createdAt", "platform", "title"]);
    assert.ok(!JSON.stringify(library).includes("Private source body")); assert.ok(!JSON.stringify(library).includes("/private/example"));
  } finally { await f.cleanup(); }
});

test("switching archives the current completed capture before restoring saved content", async () => {
  const f = await fixture();
  try {
    assert.deepEqual(await activateLocalSource(f.root, "source-b"), { analysisId: "source-b", status: "done" });
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.root, "local-analysis.json"), "utf8")), capture("source-b"));
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.root, "library/source-a.json"), "utf8")), capture("source-a"));
    assert.equal((await fs.stat(path.join(f.root, "local-analysis.json"))).mode & 0o777, 0o600);
    await assert.rejects(fs.access(path.join(f.root, "capture-launch.lock")));
    assert.deepEqual(await activateLocalSource(f.root, "source-a"), { analysisId: "source-a", status: "done" });
  } finally { await f.cleanup(); }
});

test("active captures and an existing launch lock block switching without modifying either source", async () => {
  const f = await fixture();
  try {
    for (const status of ["scraping", "transcribing", "analyzing", "unknown-active-state"]) {
      await f.put("local-analysis.json", capture("source-a", status));
      await assert.rejects(activateLocalSource(f.root, "source-b"), error => (error as { status: number }).status === 409);
      assert.equal(JSON.parse(await fs.readFile(path.join(f.root, "local-analysis.json"), "utf8")).status, status);
    }
    await f.put("local-analysis.json", capture("source-a"));
    await fs.writeFile(path.join(f.root, "capture-launch.lock"), "existing owner");
    await assert.rejects(activateLocalSource(f.root, "source-b"), error => (error as { status: number }).status === 409);
    assert.equal(await fs.readFile(path.join(f.root, "capture-launch.lock"), "utf8"), "existing owner");
    assert.equal(JSON.parse(await fs.readFile(path.join(f.root, "local-analysis.json"), "utf8")).id, "source-a");
  } finally { await f.cleanup(); }
});

test("invalid identity, oversized files, mismatched archives and symlinks cannot be activated", async () => {
  const f = await fixture();
  try {
    for (const body of [null, [], { analysisId: "../source-b" }, { analysisId: "source-b", content: capture("override") }, { analysisId: 4 }]) assert.throws(() => requestedLibraryId(body));
    assert.equal(requestedLibraryId({ analysisId: "source-b" }), "source-b");
    await f.put("library/mismatch.json", capture("other"));
    await fs.writeFile(path.join(f.root, "library/huge.json"), "x".repeat(4_000_001));
    await fs.symlink(path.join(f.root, "library/source-b.json"), path.join(f.root, "library/symlink.json"));
    for (const id of ["missing", "mismatch", "huge", "symlink"]) await assert.rejects(activateLocalSource(f.root, id), error => (error as { status: number }).status === 404);
    assert.equal(JSON.parse(await fs.readFile(path.join(f.root, "local-analysis.json"), "utf8")).id, "source-a");
    await assert.rejects(fs.access(path.join(f.root, "capture-launch.lock")));
  } finally { await f.cleanup(); }
});
