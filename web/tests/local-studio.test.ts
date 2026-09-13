import test from "node:test";
import assert from "node:assert/strict";
import { isLocalStudioRequest, validateLocalSourceUrl, localFramePath } from "../src/lib/local-studio";
import { readBoundedJson } from "../src/lib/bounded-json";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Analysis } from "../src/lib/types";

const env = { NODE_ENV: "development", CONTEXTDROP_LOCAL_STUDIO: "1" } as NodeJS.ProcessEnv;
test("local studio requires explicit development opt-in and loopback host", () => {
  const headers = new Headers({ host: "127.0.0.1:3127", origin: "http://127.0.0.1:3127" });
  assert.equal(isLocalStudioRequest(headers, true, env), true);
  assert.equal(isLocalStudioRequest(headers, true, { ...env, NODE_ENV: "production" }), false);
  assert.equal(isLocalStudioRequest(headers, true, { ...env, CONTEXTDROP_LOCAL_STUDIO: "0" }), false);
  for (const host of ["evil.example", "127.0.0.1.evil.example", "localhost@evil.example", "localhost:3127.evil.example"]) assert.equal(isLocalStudioRequest(new Headers({ host }), false, env), false);
});
test("local mutations reject absent or foreign origins and cross-site requests", () => {
  assert.equal(isLocalStudioRequest(new Headers({ host: "127.0.0.1:3127" }), true, env), false);
  assert.equal(isLocalStudioRequest(new Headers({ host: "127.0.0.1:3127", origin: "https://evil.example" }), true, env), false);
  assert.equal(isLocalStudioRequest(new Headers({ host: "127.0.0.1:3127", origin: "http://127.0.0.1:3127", "sec-fetch-site": "cross-site" }), true, env), false);
});
test("local capture validates actual social hostnames and rejects credentials and local addresses", () => {
  for (const url of ["https://youtu.be/example", "https://www.instagram.com/reel/example/", "https://www.tiktok.com/@creator/video/123", "https://x.com/creator/status/123"]) assert.equal(validateLocalSourceUrl(url), url);
  for (const url of ["https://youtube.com.evil.example/video", "https://evil.example/youtube.com", "https://127.0.0.1/video", "https://user:password@youtube.com/watch?v=x", "http://youtube.com/watch?v=x", "https://youtube.com:4433/watch?v=x"]) assert.throws(() => validateLocalSourceUrl(url));
});
test("local JSON reader stops oversized chunked input without trusting Content-Length", async () => {
  const request = new Request("http://127.0.0.1/api/local/capture", { method: "POST", body: "x".repeat(4_001) });
  await assert.rejects(readBoundedJson(request, 4_000), /too large/);
  assert.deepEqual(await readBoundedJson(new Request("http://127.0.0.1", { method: "POST", body: '{"url":"https://youtu.be/x"}' })), { url: "https://youtu.be/x" });
});

test("frame inspection follows measured timestamps after an earlier vision batch fails", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-frame-alignment-"));
  try {
    const frames = [0, 3, 6].map(time => path.join(root, `frame-${time}.jpg`));
    await Promise.all(frames.map(filename => fs.writeFile(filename, "fixture image")));
    const analysis = { source_url: "https://example.com/video", frame_descriptions: [{ timestampSec: 6 }], metadata: { local_evidence: { framePaths: frames, timestampsSec: [0, 3, 6], sourceUrl: "https://example.com/video" } } } as unknown as Analysis;
    assert.equal(await localFramePath(analysis, 0, root), await fs.realpath(frames[2]));
    assert.equal(await localFramePath(analysis, 1, root), null);
    analysis.frame_descriptions = [{ timestampSec: 7 }] as Analysis["frame_descriptions"];
    assert.equal(await localFramePath(analysis, 0, root), null);
    analysis.frame_descriptions = [{ timestampSec: 3 }] as Analysis["frame_descriptions"];
    analysis.metadata!.local_evidence = { framePaths: frames, timestampsSec: [0, 3, 3] };
    assert.equal(await localFramePath(analysis, 0, root), null);
    analysis.metadata!.local_evidence = { framePaths: frames, timestampsSec: [] };
    assert.equal(await localFramePath(analysis, 0, root), null);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("still-image evidence works while mismatched sources and escaped paths fail closed", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-frame-source-"));
  try {
    const filename = path.join(root, "preview.jpg");
    await fs.writeFile(filename, "fixture image");
    const analysis = { source_url: "contextdrop://upload/sample", frame_descriptions: [{ description: "A design" }], metadata: { local_evidence: { framePaths: [filename], timestampsSec: [], sourceUrl: "contextdrop://upload/sample" } } } as unknown as Analysis;
    assert.equal(await localFramePath(analysis, 0, root), await fs.realpath(filename));
    analysis.metadata!.local_evidence = { framePaths: [filename], sourceUrl: "contextdrop://upload/other" };
    assert.equal(await localFramePath(analysis, 0, root), null);
    analysis.metadata!.local_evidence = { framePaths: [filename] };
    const inner = path.join(root, "inner");
    await fs.mkdir(inner);
    assert.equal(await localFramePath(analysis, 0, inner), null);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
