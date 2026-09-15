import { test } from "node:test";
import assert from "node:assert/strict";
import { latestSourceRun, runIsActive, runStatusLabel, taskElapsed, taskResultPreview, taskStatusLabel, type PersonalRun, type RunOutput } from "../src/lib/local-runs";

test("task recovery stays attached to its source and chooses the most recent run", () => {
  const runs = [{ id: "old", analysisId: "source-a", createdAt: "2026-09-01" }, { id: "other", analysisId: "source-b", createdAt: "2026-09-03" }, { id: "new", analysisId: "source-a", createdAt: "2026-09-02" }] as PersonalRun[];
  assert.equal(latestSourceRun(runs, "source-a")?.id, "new");
  assert.equal(latestSourceRun(runs, "missing"), undefined);
  assert.equal(runs[0].id, "old");
});

test("a passing command or a draft report cannot make an active task appear finished", () => {
  const run = { status: "running", terminalMode: "exec" } as const;
  const output: RunOutput = { id: "fixture", mode: "streaming", progress: { phase: "checking", update: "Checking the page.", updatedAt: null }, log: { text: "All tests passed", truncated: false, updatedAt: null }, result: { text: "", path: null, source: null, verification: "unverified", truncated: false } };
  assert.equal(taskStatusLabel(run, output), "Checking the result");
  output.result.text = "Draft report saved.";
  assert.equal(taskStatusLabel(run, output), "Wrapping up");
  assert.equal(taskStatusLabel({ ...run, status: "failed" }, output), "Needs attention");
  assert.equal(taskStatusLabel({ ...run, status: "finished_unverified" }, output), "Finished · review the result");
  assert.equal(taskStatusLabel({ status: "running", terminalMode: "interactive" }, output), "Continue in Terminal");
});

test("task duration stops at the real end timestamp and tolerates an older companion", () => {
  const run = { createdAt: "2026-09-15T06:11:49Z", updatedAt: "2026-09-15T06:14:36Z", status: "finished_unverified" };
  assert.equal(taskElapsed(run, Date.parse("2026-09-15T07:00:00Z")), "2m 47s");
  assert.equal(taskElapsed({ ...run, status: "running" }, Date.parse("2026-09-15T06:12:01Z")), "12s");
  assert.equal(taskElapsed({ ...run, createdAt: "invalid" }), "");
  assert.equal(taskElapsed({ status: "finished_unverified", createdAt: run.createdAt }), "0s");
});

test("the result preview skips headings and keeps a long agent report out of the main view", () => {
  assert.equal(taskResultPreview("# Result\n\nBuilt the example. Open index.html.\n\n## Checks\nMany details."), "Built the example. Open index.html.");
  assert.ok(taskResultPreview("word ".repeat(400)).length <= 800);
});

test("stopping continues polling; ended and interrupted runs never imply verified success", () => {
  assert.equal(runIsActive("stopping"), true);
  for (const status of ["finished_unverified", "stopped", "failed", "interrupted", "unknown"]) assert.equal(runIsActive(status), false);
  assert.match(runStatusLabel("finished_unverified"), /review/i);
  assert.equal(runStatusLabel("unknown"), "Status unavailable");
});
