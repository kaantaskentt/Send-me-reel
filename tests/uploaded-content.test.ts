import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import ffmpeg from "ffmpeg-static";
import { PDFDocument } from "pdf-lib";
import { receiveUpload, readUpload, uploadOptions } from "../src/services/uploadStore.js";
import { withGeminiFile } from "../src/services/geminiFiles.js";
import { captureUploadedContent, inspectUploadedContent, parseDocumentEvidence, planPdfSegments, decodeUploadText } from "../src/services/uploadedContent.js";
import { buildGeminiVideoRequest } from "../src/services/geminiVideo.js";
import { captureIsActive } from "../web/src/lib/capture-routing.js";

const exec = promisify(execFile);
const stream = (bytes: Uint8Array) => new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes); controller.close(); } });
async function sandbox(work: (root: string) => Promise<void>) { const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-upload-test-")); try { await work(root); } finally { await fs.rm(root, { recursive: true, force: true }); } }
function fakeProvider(kind: "document" | "video" | "audio" = "document", options: { fail?: boolean; cleanup?: boolean } = {}) {
  const calls: string[] = [];
  let mime = "", counter = 0;
  const fetchImpl = (async (input, init) => {
    const url = String(input); calls.push(`${init?.method || "GET"} ${url}`);
    assert.equal(init?.redirect, "error");
    if (url.endsWith("/upload/v1beta/files")) { mime = (init?.headers as Record<string, string>)["X-Goog-Upload-Header-Content-Type"]; return new Response("", { headers: { "x-goog-upload-url": "https://generativelanguage.googleapis.com/upload/v1beta/files?upload_id=fixture" } }); }
    if (url.includes("upload_id=")) return Response.json({ file: { name: "files/fixture", uri: "https://generativelanguage.googleapis.com/v1beta/files/fixture", mimeType: mime, state: "ACTIVE" } });
    if (init?.method === "DELETE") return new Response("", { status: options.cleanup === false ? 503 : 200 });
    if (options.fail) return new Response("private provider diagnostic", { status: 429 });
    counter++;
    const request = JSON.parse(String(init?.body));
    const metadata = request.contents[0].parts[0].videoMetadata;
    const timestamp = kind === "video" ? Number.parseFloat(metadata.startOffset) : 0;
    const observation = { page: 1, timestamp: `${Math.floor(timestamp / 60).toString().padStart(2, "0")}:${(timestamp % 60).toString().padStart(2, "0")}`, description: "The example shows a GitHub project.", onScreenText: ["example/project"], urls: ["https://github.com/example/project"], tools: ["GitHub"], speech: kind === "audio" ? "The speaker explains the example." : "", uncertain: false };
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ summary: "An example project is discussed.", observations: [observation], limitations: ["Small print is uncertain."] }) }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, totalTokenCount: 120 } });
  }) as typeof fetch;
  return { fetchImpl, calls, count: () => counter };
}
test("uploads validate bounded file types and never accept filenames as filesystem paths", () => {
  assert.equal(uploadOptions("note.md").kind, "text");
  assert.equal(uploadOptions("screen.MOV").mimeType, "video/mov");
  for (const name of ["../secret.txt", "file\\name.mp4", "x\0.png", "script.sh", "document.html"]) assert.throws(() => uploadOptions(name));
  assert.throws(() => uploadOptions("a.txt", "x".repeat(2001)));
});
test("upload streaming enforces actual bytes, advertised length, cancellation, and cleanup", async () => sandbox(async root => {
  await assert.rejects(receiveUpload(root, stream(new Uint8Array(1_048_577)), "large.txt"), /under 1 MB/);
  await assert.rejects(receiveUpload(root, stream(Buffer.from("abc")), "short.txt", "", undefined, 4), /did not finish/);
  const controller = new AbortController();
  const pending = receiveUpload(root, new ReadableStream({ start() {} }), "cancel.txt", "", controller.signal);
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(pending);
  assert.deepEqual(await fs.readdir(root), []);
}));
test("upload identity validates hash and refuses redirected saved paths", async () => sandbox(async root => {
  const manifest = await receiveUpload(root, stream(Buffer.from("Hello")), "a.txt");
  assert.equal((await readUpload(root, manifest.id)).manifest.sha256, manifest.sha256);
  await fs.writeFile(path.join(root, manifest.id, "source.txt"), "Other");
  await assert.rejects(readUpload(root, manifest.id), /changed/);
  await assert.rejects(readUpload(root, "../a"), /Unknown/);
  const next = await receiveUpload(root, stream(Buffer.from("Hello")), "b.txt");
  await fs.rm(path.join(root, next.id, "source.txt"));
  await fs.symlink(path.join(root, manifest.id, "source.txt"), path.join(root, next.id, "source.txt"));
  await assert.rejects(readUpload(root, next.id), /path is invalid/);
}));
test("text uploads preserve complete Unicode evidence without model calls", async () => sandbox(async root => {
  const manifest = await receiveUpload(root, stream(Buffer.from("# Türkçe notes\nhttps://github.com/example/project\n")), "notes.md", "Find the repository");
  let checkpoint: any;
  await captureUploadedContent({ uploadRoot: root, uploadId: manifest.id, apiKey: "", onCheckpoint: async value => { checkpoint = value; }, fetchImpl: (() => { throw new Error("No model call expected"); }) as typeof fetch });
  assert.equal(checkpoint.status, "done"); assert.match(checkpoint.caption, /Türkçe/);
  assert.equal(checkpoint.metadata.source_evidence.capture_complete, true);
  assert.equal(checkpoint.metadata.userNote, "Find the repository");
  assert.equal(checkpoint.metadata.source_evidence.text.truncated, false);
  assert.throws(() => decodeUploadText(new Uint8Array([0xff])), /UTF-8/);
  assert.throws(() => decodeUploadText(Buffer.from("a\0b")), /readable/);
}));
test("PDF coverage chunks the entire document and validates real page offsets", () => {
  assert.deepEqual(planPdfSegments(21), [{ pageStart: 1, pageEnd: 10 }, { pageStart: 11, pageEnd: 20 }, { pageStart: 21, pageEnd: 21 }]);
  assert.throws(() => planPdfSegments(101));
  const data = { summary: "A page", observations: [{ page: 2, description: "A chart", onScreenText: [], urls: [], tools: [], speech: "", uncertain: true }], limitations: [] };
  assert.equal(parseDocumentEvidence(data, 2, 10).observations[0].page, 12);
  assert.throws(() => parseDocumentEvidence(data, 1));
});
test("images produce grounded source evidence and a real sanitized local inspection image", async () => sandbox(async root => {
  const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: "white" } }).png().toBuffer();
  const manifest = await receiveUpload(root, stream(png), "screenshot.png");
  const provider = fakeProvider(); let final: any;
  await captureUploadedContent({ uploadRoot: root, uploadId: manifest.id, apiKey: "fixture-key", fetchImpl: provider.fetchImpl, onCheckpoint: async value => { final = value; } });
  assert.equal(final.status, "done"); assert.equal(final.metadata.source_evidence.media_kind, "image");
  assert.ok((await fs.stat(final.metadata.local_evidence.framePaths[0])).size > 0);
  assert.equal(provider.calls.filter(call => call.startsWith("DELETE")).length, 1);
  const result = await inspectUploadedContent({ uploadRoot: root, uploadId: manifest.id, question: "What repository is visible?", apiKey: "fixture-key", fetchImpl: provider.fetchImpl });
  assert.equal(result.evidence.observations[0].description, "The example shows a GitHub project.");
}));
test("PDF capture reads each page group and focused reinspection validates page bounds", async () => sandbox(async root => {
  const pdf = await PDFDocument.create(); for (let index = 0; index < 11; index++) pdf.addPage();
  const manifest = await receiveUpload(root, stream(await pdf.save()), "guide.pdf");
  const provider = fakeProvider(); let final: any;
  await captureUploadedContent({ uploadRoot: root, uploadId: manifest.id, apiKey: "fixture-key", fetchImpl: provider.fetchImpl, onCheckpoint: async value => { final = value; } });
  assert.equal(final.status, "done"); assert.equal(provider.count(), 2);
  assert.equal(final.metadata.source_evidence.document.pageCount, 11);
  assert.equal(final.metadata.source_evidence.document.sections[1].evidence.observations[0].page, 11);
  await assert.rejects(inspectUploadedContent({ uploadRoot: root, uploadId: manifest.id, question: "Read all", pageStart: 1, pageEnd: 11, apiKey: "fixture-key", fetchImpl: provider.fetchImpl }), /1–5/);
  const result = await inspectUploadedContent({ uploadRoot: root, uploadId: manifest.id, question: "Read this page", pageStart: 11, pageEnd: 11, apiKey: "fixture-key", fetchImpl: provider.fetchImpl });
  assert.equal((result.evidence.observations[0] as { page?: number }).page, 11);
  assert.equal((await fs.readdir(path.join(root, manifest.id))).some(name => name.startsWith("inspection-")), false);
}));
test("provider artifacts are deleted after analysis failures and credentials never leave fixed origin", async () => sandbox(async root => {
  const filename = path.join(root, "fixture.bin"); await fs.writeFile(filename, "fixture");
  const provider = fakeProvider("document", { fail: true });
  await assert.rejects(withGeminiFile(filename, "application/pdf", { apiKey: "fixture-secret", fetchImpl: provider.fetchImpl }, async () => { throw new Error("model failed"); }), /model failed/);
  assert.equal(provider.calls.at(-1), "DELETE https://generativelanguage.googleapis.com/v1beta/files/fixture");
  let calls = 0;
  await assert.rejects(withGeminiFile(filename, "application/pdf", { apiKey: "fixture-secret", fetchImpl: (async () => { calls++; return new Response("", { headers: { "x-goog-upload-url": "https://attacker.invalid/upload/file" } }); }) as typeof fetch }, async () => true), /unexpected upload destination/);
  assert.equal(calls, 1);
}));
test("uploaded video validates measured duration and uses provider video input with exact file identity", async () => sandbox(async root => {
  assert.equal(typeof ffmpeg, "string");
  const video = path.join(root, "fixture.mp4");
  await exec(ffmpeg as string, ["-nostdin", "-v", "error", "-f", "lavfi", "-i", "color=c=white:s=64x64:d=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", video]);
  const manifest = await receiveUpload(root, stream(await fs.readFile(video)), "clip.mp4");
  const provider = fakeProvider("video"); let final: any;
  await captureUploadedContent({ uploadRoot: root, uploadId: manifest.id, apiKey: "fixture-key", fetchImpl: provider.fetchImpl, onCheckpoint: async value => { final = value; } });
  assert.equal(final.status, "done"); assert.equal(final.metadata.duration, 2);
  assert.equal(final.metadata.source_evidence.native_video.coverage.completedSeconds, 2);
  const inspected = await inspectUploadedContent({ uploadRoot: root, uploadId: manifest.id, question: "Read this moment", startSec: 1, endSec: 2, apiKey: "fixture-key", fetchImpl: provider.fetchImpl });
  assert.equal(inspected.evidence.observations[0].timestampSec, 1);
  assert.deepEqual(inspected.range, { startSec: 1, endSec: 2 });
  await assert.rejects(inspectUploadedContent({ uploadRoot: root, uploadId: manifest.id, question: "Look here", startSec: 0, endSec: 3, apiKey: "fixture-key", fetchImpl: provider.fetchImpl }), /existing moment/);
  assert.throws(() => buildGeminiVideoRequest(final.source_url, { startSec: 0, endSec: 2 }, "", undefined, { fileUri: "https://attacker.invalid/video.mp4", mimeType: "video/mp4" }));
}));
test("uploaded audio is measured, locally clipped and grounded without pretending to have screenshots", async () => sandbox(async root => {
  const audio = path.join(root, "fixture.wav");
  await exec(ffmpeg as string, ["-nostdin", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", audio]);
  const manifest = await receiveUpload(root, stream(await fs.readFile(audio)), "clip.wav");
  const provider = fakeProvider("audio"); let final: any;
  await captureUploadedContent({ uploadRoot: root, uploadId: manifest.id, apiKey: "fixture-key", fetchImpl: provider.fetchImpl, onCheckpoint: async value => { final = value; } });
  assert.equal(final.status, "done"); assert.equal(final.metadata.source_evidence.visuals.status, "not_applicable");
  assert.deepEqual(final.frame_descriptions[0].onScreenText, []);
  assert.deepEqual(final.metadata.local_evidence.framePaths, []);
  assert.equal((await fs.readdir(path.join(root, manifest.id))).some(name => name.startsWith("inspection-")), false);
}));
test("upload worker remains active within its longer declared capture budget", () => {
  const now = Date.now();
  assert.equal(captureIsActive({ status: "analyzing", created_at: new Date(now - 20 * 60_000).toISOString(), metadata: { local_capture: { timeoutSeconds: 1800 } } }, now), true);
  assert.equal(captureIsActive({ status: "analyzing", created_at: new Date(now - 32 * 60_000).toISOString(), metadata: { local_capture: { timeoutSeconds: 1800 } } }, now), false);
});
