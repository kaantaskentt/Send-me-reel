import test from "node:test";
import assert from "node:assert/strict";
import { buildGeminiVideoRequest, canonicalYouTubeVideoUrl, captureGeminiVideo, inspectGeminiVideoMoment, parseGeminiVideoEvidence, parseGeminiVideoModelEvidence, planGeminiVideoSegments, type GeminiVideoManifest } from "../src/services/geminiVideo.js";

const SOURCE = "https://www.youtube.com/watch?v=QhmhUgccaS0";
const observation = (timestampSec = 15) => ({ timestampSec, description: "A GitHub repository header is shown.", onScreenText: ["example/project"], urls: ["https://github.com/example/project"], tools: ["GitHub"], speech: "The speaker describes a repository.", uncertain: false });
const evidence = (timestampSec = 15) => ({ summary: "A repository is discussed.", observations: [observation(timestampSec)], limitations: ["A tiny URL cannot be read."] });
const modelEvidence = (timestampSec = 15) => ({ ...evidence(timestampSec), observations: [{ ...observation(timestampSec), timestamp: `${Math.floor(timestampSec / 60).toString().padStart(2, "0")}:${(timestampSec % 60).toString().padStart(2, "0")}` }] });
const okResponse = (timestampSec = 15, finishReason = "STOP") => new Response(JSON.stringify({ candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify(modelEvidence(timestampSec)) }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 4, cachedContentTokenCount: 50, totalTokenCount: 124 } }), { headers: { "Content-Type": "application/json" } });
const fakeFetch = (work: (input: string | URL | Request, init?: RequestInit) => Promise<Response>): typeof fetch => work as typeof fetch;

test("native capture canonicalizes exact YouTube video identities and rejects lookalikes", () => {
  assert.equal(canonicalYouTubeVideoUrl("https://youtu.be/QhmhUgccaS0?t=12"), SOURCE);
  assert.equal(canonicalYouTubeVideoUrl("https://m.youtube.com/shorts/QhmhUgccaS0"), SOURCE);
  for (const url of ["https://youtube.com.attacker.test/watch?v=QhmhUgccaS0", "https://youtube.com@localhost/watch?v=QhmhUgccaS0", "http://youtube.com/watch?v=QhmhUgccaS0", "https://youtube.com:4430/watch?v=QhmhUgccaS0", "https://youtube.com/playlist?list=x", "https://instagram.com/reel/test/"]) {
    assert.throws(() => canonicalYouTubeVideoUrl(url));
  }
});

test("native long-video segments cover the whole source once within the 60-minute bound", () => {
  assert.deepEqual(planGeminiVideoSegments(1_250.5), [{ startSec: 0, endSec: 600 }, { startSec: 600, endSec: 1_200 }, { startSec: 1_200, endSec: 1_250.5 }]);
  assert.equal(planGeminiVideoSegments(3_600).length, 6);
  for (const duration of [0, -1, NaN, Infinity, 3_600.1]) assert.throws(() => planGeminiVideoSegments(duration));
});

test("native requests include real video clipping and require absolute source timestamps", () => {
  const request = buildGeminiVideoRequest(SOURCE, { startSec: 600, endSec: 900 }, "Find the repository");
  const video = request.contents[0].parts[0] as { fileData: { fileUri: string }; videoMetadata: { startOffset: string; endOffset: string; fps: number } };
  assert.equal(video.fileData.fileUri, SOURCE);
  assert.deepEqual(video.videoMetadata, { startOffset: "600s", endOffset: "900s", fps: 1 });
  assert.equal(request.generationConfig.maxOutputTokens, 3_072);
  assert.throws(() => buildGeminiVideoRequest(SOURCE, { startSec: 0, endSec: 601 }));
  assert.throws(() => parseGeminiVideoEvidence(evidence(15), { startSec: 600, endSec: 900 }));
  assert.equal(parseGeminiVideoEvidence(evidence(615), { startSec: 600, endSec: 900 }).observations[0].timestampSec, 615);
  assert.throws(() => parseGeminiVideoEvidence({ ...evidence(), observations: [] }, { startSec: 0, endSec: 60 }));
  assert.throws(() => parseGeminiVideoEvidence({ ...evidence(), observations: [observation(30), observation(20)] }, { startSec: 0, endSec: 60 }));
});

test("native model MM:SS output converts unambiguously while numeric MMSS is rejected", () => {
  const parsed = parseGeminiVideoModelEvidence(modelEvidence(396), { startSec: 0, endSec: 517 });
  assert.equal(parsed.observations[0].timestampSec, 396);
  assert.throws(() => parseGeminiVideoModelEvidence(evidence(636), { startSec: 0, endSec: 900 }), /MM:SS/);
  for (const timestamp of ["6:36", "06:99", "636", "-1:12", "01:02:03"]) {
    assert.throws(() => parseGeminiVideoModelEvidence({ ...evidence(), observations: [{ ...observation(), timestamp }] }, { startSec: 0, endSec: 900 }));
  }
  assert.throws(() => parseGeminiVideoModelEvidence(modelEvidence(15), { startSec: 600, endSec: 900 }), /absolute seconds/);
});

test("native capture calls fixed provider, sends key only as header, and records real usage", async () => {
  const checkpoints: GeminiVideoManifest[] = [];
  const result = await captureGeminiVideo({ sourceUrl: SOURCE, durationSeconds: 60, apiKey: "test-only-key", onCheckpoint: async value => { checkpoints.push(value); }, fetchImpl: fakeFetch(async (url, init) => {
    assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
    assert.equal((init?.headers as Record<string, string>)["x-goog-api-key"], "test-only-key");
    assert.ok(!String(init?.body).includes("test-only-key"));
    assert.equal(init?.redirect, "error");
    return okResponse();
  }) });
  assert.equal(result.status, "complete");
  assert.equal(result.coverage.completedSeconds, 60);
  assert.equal(result.usage.totalTokenCount, 124);
  assert.ok(checkpoints.some(item => item.status === "running" && !item.coverage.complete));
  assert.ok(!JSON.stringify(result).includes("test-only-key"));
});

test("native partial capture resumes missing clips without rebilling completed clips", async () => {
  let calls = 0;
  const options = { sourceUrl: SOURCE, durationSeconds: 900, apiKey: "test" };
  const first = await captureGeminiVideo({ ...options, fetchImpl: fakeFetch(async () => ++calls === 1 ? okResponse(15) : new Response("secret provider detail", { status: 429 })) });
  assert.equal(first.status, "partial");
  assert.equal(first.coverage.complete, false);
  assert.equal(first.coverage.completedSeconds, 600);
  assert.equal(first.segments[1].errorCode, "GEMINI_HTTP_429");
  assert.ok(!JSON.stringify(first).includes("secret provider detail"));
  let resumedCalls = 0;
  const next = await captureGeminiVideo({ ...options, resume: first, fetchImpl: fakeFetch(async (_url, init) => {
    resumedCalls += 1;
    assert.equal(JSON.parse(String(init?.body)).contents[0].parts[0].videoMetadata.startOffset, "600s");
    return okResponse(615);
  }) });
  assert.equal(resumedCalls, 1);
  assert.equal(next.status, "complete");
  assert.equal(next.usage.totalTokenCount, 248);
  assert.equal(next.segments[1].attempts, 2);
  const cached = await captureGeminiVideo({ ...options, resume: next, fetchImpl: fakeFetch(async () => { assert.fail("Completed capture should not call provider"); }) });
  assert.equal(cached.status, "complete");
  await assert.rejects(captureGeminiVideo({ ...options, question: "different focus", resume: next }), /does not match/);
});

test("native capture cannot mark truncated, empty, corrupt or out-of-clip observations complete", async () => {
  const responses = [okResponse(15, "MAX_TOKENS"), okResponse(61), new Response("not json"), new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ ...evidence(), observations: [] }) }] } }] }))];
  for (const response of responses) {
    const result = await captureGeminiVideo({ sourceUrl: SOURCE, durationSeconds: 60, apiKey: "test", fetchImpl: fakeFetch(async () => response) });
    assert.equal(result.status, "failed");
    assert.equal(result.coverage.complete, false);
    assert.equal(result.coverage.completedSeconds, 0);
  }
});

test("native cancellation and missing configuration produce no inference", async () => {
  const controller = new AbortController(); controller.abort();
  const result = await captureGeminiVideo({ sourceUrl: SOURCE, durationSeconds: 60, apiKey: "test", signal: controller.signal, fetchImpl: fakeFetch(async () => { assert.fail("Cancelled capture must not call provider"); }) });
  assert.equal(result.status, "failed");
  assert.equal(result.segments[0].errorCode, "CAPTURE_TIMEOUT");
  await assert.rejects(captureGeminiVideo({ sourceUrl: SOURCE, durationSeconds: 60, apiKey: "" }), /Configure/);
});

test("native provider output is bounded before JSON parsing", async () => {
  const result = await captureGeminiVideo({ sourceUrl: SOURCE, durationSeconds: 60, apiKey: "test", fetchImpl: fakeFetch(async () => new Response(" ".repeat(512 * 1_024 + 1))) });
  assert.equal(result.status, "failed");
  assert.equal(result.segments[0].errorCode, "PROVIDER_RESPONSE_TOO_LARGE");
});

test("native moment inspection sends only the bounded high-detail clip and preserves source timing", async () => {
  let calls = 0;
  const result = await inspectGeminiVideoMoment({ sourceUrl: SOURCE, durationSeconds: 517, startSec: 390, endSec: 420, question: "Read the repository name and address bar", apiKey: "test", fetchImpl: fakeFetch(async (_url, init) => {
    calls += 1;
    const request = JSON.parse(String(init?.body));
    assert.deepEqual(request.contents[0].parts[0].videoMetadata, { startOffset: "390s", endOffset: "420s", fps: 2 });
    assert.equal(request.generationConfig.mediaResolution, "MEDIA_RESOLUTION_HIGH");
    return okResponse(396);
  }) });
  assert.equal(calls, 1);
  assert.equal(result.evidence.observations[0].timestampSec, 396);
  assert.deepEqual(result.range, { startSec: 390, endSec: 420 });
  assert.equal(result.usage.totalTokenCount, 124);
});

test("native moment inspection refuses broad, missing or out-of-source requests before inference", async () => {
  const options = { sourceUrl: SOURCE, durationSeconds: 517, startSec: 390, endSec: 420, question: "Read the URL", apiKey: "test", fetchImpl: fakeFetch(async () => { assert.fail("Invalid inspection must not call provider"); }) };
  for (const range of [{ startSec: 0, endSec: 517 }, { startSec: -1, endSec: 15 }, { startSec: 510, endSec: 530 }, { startSec: 15, endSec: 15 }]) {
    await assert.rejects(inspectGeminiVideoMoment({ ...options, ...range }), /at most 30 seconds/);
  }
  await assert.rejects(inspectGeminiVideoMoment({ ...options, question: "" }), /focused inspection question/);
  await assert.rejects(inspectGeminiVideoMoment({ ...options, fetchImpl: fakeFetch(async () => okResponse(15)) }), /absolute seconds/);
});
