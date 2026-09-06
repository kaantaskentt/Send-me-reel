import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { buildSourceEvidence, parseReplicationPlan, replicationPlanMarkdown } from "../src/lib/execution-plan";
import { createReplicationHandler, type ReplicationDependencies } from "../src/lib/replication-handler";
import { reserveDailyAiRequest } from "../src/lib/daily-ai-usage";

const analysisId = "11111111-1111-4111-8111-111111111111";
const source = { id: analysisId, source_url: "https://youtube.com/watch?v=fixture", platform: "youtube", status: "done", transcript: "Click the button to switch the page theme.", frame_descriptions: [{ timestampSec: 12, description: "A button changes the page theme." }], caption: null, metadata: { duration: 20 } };
const draft = { title: "Build the theme switch", summary: "Create and verify a theme switch.", prerequisites: ["A new workspace"], steps: [{ id: "step-1", instruction: "Add the demonstrated theme switch.", evidenceIds: ["frame-1"], kind: "observed", verification: "Clicking the button visibly changes the theme." }], warnings: [], successCriteria: ["The theme switches in both directions."] };
const packet = () => ({ ...draft, version: 1, analysisId, sourceUrl: source.source_url, goal: "Build a working theme switch.", mode: "build", evidence: buildSourceEvidence(source).evidence });

test("portable plan rejects fabricated references, observed steps without evidence and unsafe URLs", () => {
  assert.equal(parseReplicationPlan(packet()).steps[0].kind, "observed");
  assert.throws(() => parseReplicationPlan({ ...packet(), steps: [{ ...draft.steps[0], evidenceIds: ["invented"] }] }), /unknown evidence/);
  assert.throws(() => parseReplicationPlan({ ...packet(), steps: [{ ...draft.steps[0], evidenceIds: [] }] }), /require source evidence/);
  assert.throws(() => parseReplicationPlan({ ...packet(), sourceUrl: "javascript:alert(1)" }), /HTTP/);
  assert.throws(() => parseReplicationPlan({ ...packet(), sourceUrl: "https://user:password@example.com" }), /credentials/);
  assert.throws(() => parseReplicationPlan({ ...packet(), command: "rm -rf /" }), /unexpected/);
});

test("portable plan rejects duplicates, invalid timestamps, huge fields and unsupported versions", () => {
  assert.throws(() => parseReplicationPlan({ ...packet(), evidence: [packet().evidence[0], packet().evidence[0]] }), /Duplicate evidence/);
  assert.throws(() => parseReplicationPlan({ ...packet(), steps: [draft.steps[0], draft.steps[0]] }), /Duplicate step/);
  assert.throws(() => parseReplicationPlan({ ...packet(), evidence: [{ ...packet().evidence[0], timestampSec: Infinity }] }), /timestamp/);
  assert.throws(() => parseReplicationPlan({ ...packet(), goal: "x".repeat(1_201) }), /Goal/);
  assert.throws(() => parseReplicationPlan({ ...packet(), version: 2 }), /version/);
  assert.match(replicationPlanMarkdown(parseReplicationPlan(packet())), /Execution and outcome verification have not happened/);
});

test("source capture keeps late frames, raw transcript and explicit capture gaps", () => {
  const result = buildSourceEvidence({ ...source, transcript: "x".repeat(40_000), frame_descriptions: Array.from({ length: 120 }, (_, i) => ({ timestampSec: i * 4, description: `Observed state ${i}` })), metadata: { duration: 500, source_evidence: { warnings: ["Audio retrieval failed upstream."] } } });
  assert.equal(result.evidence.filter((e) => e.kind === "frame").length, 40);
  assert.ok(result.evidence.some((e) => e.id === "frame-120" && e.timestampSec === 476));
  assert.ok(result.evidence.filter((e) => e.kind === "transcript").every((e) => e.timestampSec === null));
  assert.ok(result.warnings.some((w) => w.includes("32,000")));
  assert.ok(result.warnings.some((w) => w.includes("Audio retrieval failed")));
});

function harness(overrides: Partial<ReplicationDependencies> = {}, row: unknown = source) {
  const filters: [string, string][] = [];
  let modelCalls = 0; let reservations = 0;
  const query = { select() { return this; }, eq(key: string, value: string) { filters.push([key, value]); return this; }, async single() { return { data: row, error: null }; } };
  const handler = createReplicationHandler({
    session: async () => ({ sub: "owner-user" }),
    database: (() => ({ from: () => query })) as unknown as ReplicationDependencies["database"],
    configured: () => true,
    reserve: async () => { reservations++; return { allowed: true, remaining: 19, resetAt: "2026-09-07T00:00:00Z" }; },
    complete: async (params) => {
      modelCalls++;
      const message = params.messages.find((m) => m.role === "user");
      assert.match(String(message?.content), /Click the button to switch/);
      assert.match(String(message?.content), /A button changes the page theme/);
      return { choices: [{ finish_reason: "stop", message: { content: JSON.stringify(draft) } }] };
    },
    ...overrides,
  });
  const send = (body: unknown = { goal: "Build a working theme switch.", mode: "build" }, origin = "http://localhost:3127") => handler(new NextRequest(`http://localhost:3127/api/analyses/${analysisId}/replicate`, { method: "POST", headers: { "Content-Type": "application/json", origin }, body: typeof body === "string" ? body : JSON.stringify(body) }), { params: Promise.resolve({ id: analysisId }) });
  return { send, filters, modelCalls: () => modelCalls, reservations: () => reservations };
}

test("endpoint rejects signed-out and cross-origin requests before model or quota", async () => {
  const unauth = harness({ session: async () => null });
  assert.equal((await unauth.send()).status, 401); assert.equal(unauth.modelCalls(), 0);
  const cross = harness(); assert.equal((await cross.send(undefined, "https://attacker.example")).status, 403); assert.equal(cross.reservations(), 0);
});

test("endpoint scopes ownership and rejects missing/incomplete analyses", async () => {
  const missing = harness({}, null); assert.equal((await missing.send()).status, 404);
  assert.deepEqual(missing.filters, [["id", analysisId], ["user_id", "owner-user"]]);
  const incomplete = harness({}, { ...source, status: "pending" }); assert.equal((await incomplete.send()).status, 409); assert.equal(incomplete.modelCalls(), 0);
});

test("endpoint validates bounded requests and rejects summary-only analyses", async () => {
  const h = harness();
  assert.equal((await h.send("{bad")).status, 400);
  assert.equal((await h.send({ goal: "x".repeat(1_201), mode: "build" })).status, 400);
  assert.equal((await h.send({ goal: "Build it please.", mode: "shell", command: "echo x" })).status, 400);
  assert.equal(h.reservations(), 0);
  const empty = harness({}, { ...source, transcript: null, frame_descriptions: null, caption: null, visual_summary: "A nice website" });
  assert.equal((await empty.send()).status, 422); assert.equal(empty.modelCalls(), 0);
});

test("endpoint reserves durable usage before generation and fails closed", async () => {
  const quota = harness({ reserve: async () => ({ allowed: false, remaining: 0, resetAt: "2026-09-07" }) });
  assert.equal((await quota.send()).status, 429); assert.equal(quota.modelCalls(), 0);
  const unavailable = harness({ reserve: async () => { throw new Error("database unavailable"); } });
  assert.equal((await unavailable.send()).status, 502); assert.equal(unavailable.modelCalls(), 0);
  const noKey = harness({ configured: () => false }); assert.equal((await noKey.send()).status, 503); assert.equal(noKey.reservations(), 0);
});

test("endpoint uses source-assigned evidence and rejects model fabrications", async () => {
  const valid = harness(); const response = await valid.send(); assert.equal(response.status, 200);
  const data = await response.json(); assert.equal(data.status, "prepared"); assert.equal(data.usage.remaining, 19); assert.equal(valid.reservations(), 1);
  assert.equal(data.plan.sourceUrl, source.source_url); assert.equal(data.plan.evidence[1].timestampSec, 12);
  const invented = harness({ complete: async () => ({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ ...draft, steps: [{ ...draft.steps[0], evidenceIds: ["imagined-frame"] }] }) } }] }) });
  assert.equal((await invented.send()).status, 502);
  const replacement = harness({ complete: async () => ({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ ...draft, evidence: [{ id: "fake" }] }) } }] }) });
  assert.equal((await replacement.send()).status, 502);
});

test("quota write errors prevent reservations and compare-and-set retries contested rows", async () => {
  let reads = 0; let writes = 0;
  const predicates: string[] = [];
  const fake = {
    from: () => ({
      select() { return this; }, eq() { return this; },
      single: async () => ({ data: { daily_chat_count: reads++, daily_chat_reset_at: "2099-01-01T00:00:00Z" }, error: null }),
      update() {
        const update = { eq(key: string) { predicates.push(key); return this; }, select() { return this; }, maybeSingle: async () => ({ data: ++writes === 1 ? null : { id: "user" }, error: null }) };
        return update;
      },
    }),
  };
  const result = await reserveDailyAiRequest(fake as never, "user");
  assert.equal(result.allowed, true); assert.equal(reads, 2); assert.equal(writes, 2);
  assert.ok(predicates.includes("daily_chat_count")); assert.ok(predicates.includes("daily_chat_reset_at"));
  await assert.rejects(() => reserveDailyAiRequest({ from: () => ({ select() { return this; }, eq() { return this; }, single: async () => ({ data: null, error: { message: "unavailable" } }) }) } as never, "user"), /could not be checked/);
});
