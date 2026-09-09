import assert from "node:assert/strict";
import test from "node:test";

process.env.TELEGRAM_BOT_TOKEN = "offline-test";
process.env.OPENAI_API_KEY = "offline-test";
process.env.SUPABASE_URL = "https://offline-test.invalid";
process.env.SUPABASE_SERVICE_KEY = "offline-test";
const { settleQueueFailure, shouldRetryPipeline } = await import("../src/pipeline/queueWorker.js");
const { ServiceError } = await import("../src/pipeline/types.js");
const analyses = await import("../src/db/analyses.js");
const { supabase } = await import("../src/db/client.js");
const { executeVideoPipeline, executeArticlePipeline } = await import("../src/pipeline/orchestrator.js");

test("cancelled analyses stop before database, download or paid provider work", async () => {
  const controller = new AbortController();
  controller.abort(new ServiceError("PIPELINE_TIMEOUT", "Analysis timed out"));
  await assert.rejects(executeVideoPipeline("unused", "unused", "https://example.com", "youtube", undefined, controller.signal), /Analysis timed out/);
  await assert.rejects(executeArticlePipeline("unused", "unused", "https://example.com", undefined, controller.signal), /Analysis timed out/);
});

test("transient failures retry without refunding; only final failure refunds once", async () => {
  const events: string[] = [];
  const effects = {
    retry: async () => { events.push("retry"); },
    fail: async () => { events.push("failed"); },
    refund: async () => { events.push("refund"); },
  };
  const error = new ServiceError("NETWORK", "Temporary network failure", true);
  await settleQueueFailure(error, 1, effects);
  await settleQueueFailure(error, 2, effects);
  assert.deepEqual(events, ["retry", "retry"]);
  await settleQueueFailure(error, 3, effects);
  assert.deepEqual(events, ["retry", "retry", "failed", "refund"]);
});

test("permanent failures stop immediately and are refunded", async () => {
  const events: string[] = [];
  assert.equal(shouldRetryPipeline(new ServiceError("VIDEO_TOO_LONG", "Too long", false), 1), false);
  await settleQueueFailure(new ServiceError("VIDEO_TOO_LONG", "Too long", false), 1, {
    retry: async () => { events.push("retry"); },
    fail: async () => { events.push("failed"); },
    refund: async () => { events.push("refund"); },
  });
  assert.deepEqual(events, ["failed", "refund"]);
});

test("failed terminal persistence cannot silently refund a job that remains claimable", async () => {
  let refunded = false;
  await assert.rejects(settleQueueFailure(new ServiceError("PERMANENT", "failed"), 1, {
    retry: async () => {},
    fail: async () => { throw new Error("Database unavailable"); },
    refund: async () => { refunded = true; },
  }), /Database unavailable/);
  assert.equal(refunded, false);
});

test("database status and result errors propagate including compatibility fallback errors", async () => {
  const originalFrom = supabase.from;
  const responses: Array<{ error: { message: string } | null }> = [];
  const payloads: Record<string, unknown>[] = [];
  const guards: unknown[][] = [];
  const builder = {
    update(payload: Record<string, unknown>) { payloads.push({ ...payload }); return this; },
    eq() { return this; },
    neq(...args: unknown[]) { guards.push(args); return this; },
    select() { return this; },
    async single() { return responses.shift() ?? { error: null }; },
  };
  supabase.from = (() => builder) as unknown as typeof supabase.from;
  try {
    responses.push({ error: { message: "Connection unavailable" } });
    await assert.rejects(analyses.updateStatus("analysis-id", "done"), /Connection unavailable/);
    responses.push({ error: { message: "permission denied" } });
    await assert.rejects(analyses.updateResult("analysis-id", { status: "done", verdict: "Stored" }), /permission denied/);
    responses.push({ error: { message: "subject_research column missing from schema cache" } }, { error: { message: "Second write failed" } });
    await assert.rejects(analyses.updateResult("analysis-id", { status: "done", subjectResearch: {} }), /Second write failed/);
    assert.equal("subject_research" in payloads.at(-1)!, false);
    assert.ok(guards.length >= 3);
    assert.deepEqual(guards[0], ["status", "failed"]);
  } finally { supabase.from = originalFrom; }
});
