import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { resolveYtDlpExecutable } from "../src/services/mediaRuntime.ts";
import { ytDlpMetadataArgs, parseYtDlpMetadata, YTDLP_METADATA_MAX_BYTES, YTDLP_METADATA_TEMPLATE } from "../src/services/ytDlpMetadata.ts";

const execFileAsync = promisify(execFile);

test("metadata invocation selects source facts before buffering and retains bounded literal URL arguments", () => {
  const url = "https://youtube.com/watch?v=inert&x=$(inert)";
  const args = ytDlpMetadataArgs(url);
  assert.deepEqual(args.slice(-2), ["--", url]);
  assert.equal(args[args.indexOf("--print") + 1], YTDLP_METADATA_TEMPLATE);
  assert.ok(args.includes("--no-playlist"));
  assert.ok(args.includes("--socket-timeout"));
  assert.ok(!args.some((value) => /--dump-(single-)?json/.test(value)));
  assert.ok(!/subtitles|automatic_captions|fragments|requested_formats/.test(YTDLP_METADATA_TEMPLATE));
  assert.equal(YTDLP_METADATA_MAX_BYTES, 1024 * 1024);
});

test("compact metadata retains source content and detects missing formats without invented evidence", () => {
  const data = parseYtDlpMetadata(JSON.stringify({ source: { id: "source", title: "Line 1\nLine 2", duration: 12 }, formats: [{ format_id: "18" }], chapters: [{ title: "Start", start_time: 0, end_time: 12 }] }));
  assert.equal(data.title, "Line 1\nLine 2");
  assert.equal(data.duration, 12);
  assert.equal(data.formats.length, 1);
  assert.equal(data.chapters[0].start_time, 0);
  const empty = parseYtDlpMetadata('{"source":{"id":"photo"},"formats":null,"chapters":null}');
  assert.deepEqual(empty.formats, []);
  assert.deepEqual(empty.chapters, []);
  for (const raw of ["", "[]", "{\"source\":[]}", "{\"title\":\"unprojected\"}"]) assert.throws(() => parseYtDlpMetadata(raw));
  assert.throws(() => parseYtDlpMetadata(" ".repeat(YTDLP_METADATA_MAX_BYTES + 1)), (error: any) => error.code === "METADATA_TOO_LARGE");
});

test("real yt-dlp template projects an info fixture exceeding the old 10 MiB limit without copying captions or fragments", async (context) => {
  const executable = resolveYtDlpExecutable();
  try {
    await execFileAsync(executable, ["--version"], { timeout: 10_000, maxBuffer: 4096 });
  } catch (error: any) {
    if (error.code === "ENOENT") { context.skip("yt-dlp is not installed; the template integration fixture needs the media runtime"); return; }
    throw error;
  }
  const directory = await mkdtemp(path.join(os.tmpdir(), "contextdrop-metadata-"));
  try {
    const fixture = {
      id: "fixture", title: "Metadata size regression", description: "Useful source description", duration: 517,
      uploader: "Creator", webpage_url: "https://example.invalid/watch/fixture", ext: "mp4",
      url: "https://example.invalid/video.mp4",
      automatic_captions: { en: [{ ext: "json3", url: "https://example.invalid/caption", unused: "c".repeat(6 * 1024 * 1024) }] },
      formats: [{ format_id: "18", ext: "mp4", vcodec: "avc1", acodec: "mp4a", url: "https://example.invalid/video.mp4", fragments: [{ url: "f".repeat(6 * 1024 * 1024) }] }],
      chapters: [{ title: "Start", start_time: 0, end_time: 517, unused: "discard chapter extras" }],
    };
    const serialized = JSON.stringify(fixture);
    assert.ok(Buffer.byteLength(serialized) > 10 * 1024 * 1024);
    const fixturePath = path.join(directory, "metadata.info.json");
    await writeFile(fixturePath, serialized);
    // Load a local info file; skip download/format checks to avoid all network access.
    const { stdout } = await execFileAsync(executable, ["--ignore-config", "--load-info-json", fixturePath, "--print", YTDLP_METADATA_TEMPLATE, "--skip-download", "--no-check-formats", "--no-playlist"], { timeout: 15_000, maxBuffer: YTDLP_METADATA_MAX_BYTES });
    assert.ok(Buffer.byteLength(stdout) < 4096);
    assert.ok(!/automatic_captions|fragments|discard chapter extras/.test(stdout));
    const data = parseYtDlpMetadata(stdout);
    assert.equal(data.id, "fixture");
    assert.equal(data.duration, 517);
    assert.deepEqual(data.formats, [{ format_id: "18" }]);
    assert.deepEqual(data.chapters, [{ title: "Start", start_time: 0, end_time: 517 }]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
