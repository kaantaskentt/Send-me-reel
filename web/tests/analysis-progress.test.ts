import assert from "node:assert/strict";
import { test } from "node:test";
import { analysisProgress, AnalysisPollError, parseAnalysisProgress, watchAnalysis } from "../src/lib/analysis-progress.js";

const now = Date.parse("2026-09-15T00:00:00Z");
const response = (status: string) => Response.json(analysisProgress({ status, created_at: new Date(now).toISOString() }, now));
const immediate = async () => {};

test("an old pending job stays pending and never claims a refund", () => {
  const result = analysisProgress({ status: "pending", created_at: "2026-09-14T23:00:00Z" }, now);
  assert.equal(result.status, "pending");
  assert.equal(result.delayed, true);
  assert.equal(result.refunded, false);
  assert.doesNotMatch(result.message, /failed|refunded|returned/i);
});

test("a failed job reports a refund only after the recorded refund", () => {
  const pending = analysisProgress({ status: "failed", credits_reserved_at: "2026-09-14" });
  assert.equal(pending.refunded, false);
  assert.match(pending.message, /pending/);
  const complete = analysisProgress({ status: "failed", credits_refunded_at: "2026-09-15" });
  assert.equal(complete.refunded, true);
  assert.match(complete.message, /was returned/);
  assert.doesNotMatch(analysisProgress({ status: "failed" }).message, /credit/);
});

test("polling retries a lost connection, then reaches a real result with serial requests", async () => {
  let calls = 0, active = 0, peak = 0;
  const seen: string[] = [];
  const result = await watchAnalysis("saved-link", {
    signal: new AbortController().signal, pause: immediate,
    onProgress: value => seen.push(value.status),
    fetchImpl: (async () => {
      active++; peak = Math.max(peak, active);
      await Promise.resolve(); active--;
      if (++calls === 1) throw new Error("Disconnected");
      return response(calls === 2 ? "pending" : "done");
    }) as typeof fetch,
  });
  assert.equal(peak, 1);
  assert.equal(calls, 3);
  assert.deepEqual(seen, ["pending", "done"]);
  assert.equal(result.status, "done");
});

test("expired sign-in stops polling instead of showing an endless spinner", async () => {
  let calls = 0;
  await assert.rejects(watchAnalysis("saved", {
    signal: new AbortController().signal, pause: immediate, onProgress() {},
    fetchImpl: (async () => { calls++; return new Response(null, { status: 401 }); }) as typeof fetch,
  }), error => error instanceof AnalysisPollError && error.kind === "sign-in");
  assert.equal(calls, 1);
});

test("prolonged status outage pauses checking without inventing job failure", async () => {
  let calls = 0;
  await assert.rejects(watchAnalysis("saved", {
    signal: new AbortController().signal, pause: immediate, onProgress() { assert.fail("No result was read"); },
    fetchImpl: (async () => { calls++; return new Response(null, { status: 503 }); }) as typeof fetch,
  }), error => error instanceof AnalysisPollError && error.kind === "connection");
  assert.equal(calls, 5);
});

test("cancellation prevents late progress from replacing a new job", async () => {
  const controller = new AbortController();
  await assert.rejects(watchAnalysis("saved", {
    signal: controller.signal, pause: immediate, onProgress() { assert.fail("Late progress"); },
    fetchImpl: (async () => { controller.abort(new Error("Cancelled")); return response("done"); }) as typeof fetch,
  }), /Cancelled/);
});

test("bounded checking can resume later and invalid responses are rejected", async () => {
  await assert.rejects(watchAnalysis("saved", {
    signal: new AbortController().signal, pause: immediate, maxChecks: 2, onProgress() {},
    fetchImpl: (async () => response("pending")) as typeof fetch,
  }), error => error instanceof AnalysisPollError && error.kind === "waiting");
  assert.throws(() => parseAnalysisProgress({ status: "done" }), /Invalid/);
  assert.throws(() => analysisProgress({ status: "invented" }), /Unknown/);
});
