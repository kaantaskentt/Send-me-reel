import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { capturedFrameIndex, sourceImageMime } from "../src/lib/source-frames.js";
import { localFramePath } from "../src/lib/local-studio.js";
import type { Analysis } from "../src/lib/types.js";
import { selectCaptureReader } from "../src/lib/capture-routing.js";

test("a precision PNG maps to its measured moment, not the overview's array position", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextdrop-precision-display-"));
  try {
    const filename = path.join(root, "frame-17.png");
    await fs.writeFile(filename, "test fixture");
    const analysis = {
      source_url: "https://www.instagram.com/reel/example/",
      frame_descriptions: [{ timestampSec: 0 }, { timestampSec: 0.5666666666666667, precisionCropId: "frame-17" }, { timestampSec: 1 }],
      metadata: { local_evidence: { framePaths: [filename], timestampsSec: [0.5666666666666667] } },
    } as unknown as Analysis;
    assert.equal(capturedFrameIndex(analysis, 0), null);
    assert.equal(capturedFrameIndex(analysis, 1), 0);
    assert.equal(capturedFrameIndex(analysis, 2), null);
    assert.equal(await localFramePath(analysis, 1, root), await fs.realpath(filename));
    assert.equal(sourceImageMime(filename), "image/png");
    assert.equal(sourceImageMime("frame.jpg"), "image/jpeg");
    assert.equal(sourceImageMime("injected.svg"), null);
    const inner = path.join(root, "inner"); await fs.mkdir(inner);
    assert.equal(await localFramePath(analysis, 1, inner), null);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("Gemini alone can read downloaded social videos and OpenAI fallback remains an explicit choice", () => {
  for (const url of ["https://www.instagram.com/reel/example/", "https://www.tiktok.com/@creator/video/123", "https://x.com/creator/status/123"]) {
    assert.equal(selectCaptureReader(url, "auto", true).downloadReader, "gemini");
    assert.equal(selectCaptureReader(url, "gemini", true).downloadReader, "gemini");
    assert.equal(selectCaptureReader(url, "openai", true).downloadReader, "openai");
    assert.equal(selectCaptureReader(url, "auto", false).downloadReader, "openai");
  }
  const youtube = "https://www.youtube.com/watch?v=o3IEkKXXXvo";
  assert.equal(selectCaptureReader(youtube, "auto", true).script, "scripts/capture-gemini.ts");
  assert.equal(selectCaptureReader(youtube, "detailed", true).downloadReader, "gemini");
  assert.equal(selectCaptureReader(youtube, "openai", true).downloadReader, "openai");
  assert.throws(() => selectCaptureReader(youtube, "gemini", false), /key/);
});
