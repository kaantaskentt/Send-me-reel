import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ANALYSIS_VIDEO_FORMAT, ANALYSIS_VIDEO_SORT, resolveYtDlpExecutable } from "../src/services/mediaRuntime";

const exec = promisify(execFile);
type Format = { format_id: string; width?: number; height?: number; vcodec?: string; acodec?: string; ext: string };
const audio: Format = { format_id: "audio", vcodec: "none", acodec: "mp4a.40.5", ext: "m4a" };
const video = (format_id: string, width: number, height: number, vcodec = "avc1", acodec = "none"): Format => ({ format_id, width, height, vcodec, acodec, ext: "mp4" });

test("real yt-dlp selection handles portrait, unknown-size, muxed, silent and landscape media without network access", { timeout: 45_000 }, async context => {
  const executable = resolveYtDlpExecutable();
  try { await exec(executable, ["--version"], { timeout: 10_000, maxBuffer: 4096 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") { context.skip("yt-dlp is required for the actual format-selector regression; CI installs it"); return; }
    throw error;
  }
  const directory = await mkdtemp(path.join(os.tmpdir(), "contextdrop-format-test-"));
  const filename = path.join(directory, "source.info.json");
  async function select(formats: Format[], selector = ANALYSIS_VIDEO_FORMAT) {
    await writeFile(filename, JSON.stringify({
      id: "fixture", title: "Offline format regression", extractor: "generic", extractor_key: "Generic", webpage_url: null,
      formats: formats.map(format => ({ ...format, url: `https://example.invalid/${format.format_id}.${format.ext}` })),
    }));
    const { stdout } = await exec(executable, ["--ignore-config", "--load-info-json", filename, "--skip-download", "--no-check-formats", "--no-playlist", "-f", selector, "-S", ANALYSIS_VIDEO_SORT, "--print", "%(format_id)s"], { timeout: 10_000, maxBuffer: 16_000 });
    return stdout.trim();
  }
  try {
    // Same relevant metadata shape observed on the failing public Instagram Reel:
    // unknown MP4 formats, portrait VP9 video-only streams, separate M4A audio.
    const reel = [audio, { format_id: "unknown", ext: "mp4" }, video("portrait720", 720, 1280, "vp09.00.31.08.00.02.02.02.00"), video("portrait1080", 1080, 1920, "vp09.00.40.08.00.02.02.02.00")];
    await assert.rejects(select(reel, "bv*[vcodec^=avc1][height<=1080]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]"), /Requested format is not available/);
    assert.equal(await select(reel), "portrait1080+audio");
    assert.equal(await select([audio, video("landscape720", 1280, 720), video("landscape1080", 1920, 1080), video("landscape4k", 3840, 2160)]), "landscape1080+audio");
    assert.equal(await select([audio, video("portrait1080", 1080, 1920), video("portrait4k", 2160, 3840)]), "portrait1080+audio");
    assert.equal(await select([{ format_id: "unknown", ext: "mp4" }]), "unknown");
    assert.equal(await select([audio, video("muxed", 1080, 1920, "avc1", "mp4a")]), "muxed");
    assert.equal(await select([video("silent", 1080, 1920)]), "silent");
    assert.equal(await select([video("only4k", 3840, 2160, "avc1", "mp4a")]), "only4k");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
