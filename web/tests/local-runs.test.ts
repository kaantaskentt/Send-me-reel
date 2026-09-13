import { test } from "node:test";
import assert from "node:assert/strict";
import { latestSourceRun, runIsActive, runStatusLabel, type PersonalRun } from "../src/lib/local-runs";

test("task recovery stays attached to its source and chooses the most recent run", () => {
  const runs = [{ id: "old", analysisId: "source-a", createdAt: "2026-09-01" }, { id: "other", analysisId: "source-b", createdAt: "2026-09-03" }, { id: "new", analysisId: "source-a", createdAt: "2026-09-02" }] as PersonalRun[];
  assert.equal(latestSourceRun(runs, "source-a")?.id, "new");
  assert.equal(latestSourceRun(runs, "missing"), undefined);
  assert.equal(runs[0].id, "old");
});

test("stopping continues polling; ended and interrupted runs never imply verified success", () => {
  assert.equal(runIsActive("stopping"), true);
  for (const status of ["finished_unverified", "stopped", "failed", "interrupted", "unknown"]) assert.equal(runIsActive(status), false);
  assert.match(runStatusLabel("finished_unverified"), /review/i);
  assert.equal(runStatusLabel("unknown"), "Status unavailable");
});
