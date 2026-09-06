import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { ServiceError } from "../src/pipeline/types.ts";
import { resolveYtDlpExecutable } from "../src/services/mediaRuntime.ts";
import * as ytDlpMetadata from "../src/services/ytDlpMetadata.ts";

function load(file: string, dependencies: Record<string, unknown>) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports: Record<string, (...args: any[]) => any> = {};
  runInNewContext(compiled, {
    exports, URL, Buffer, console: { log() {}, error() {} },
    process: { env: { APIFY_TOKEN: "inert-offline-fixture" } },
    setTimeout: (callback: () => void) => callback(),
    require(name: string) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

const sourceUrl = "https://x.com/creator/status/123456789";
const video = {
  id: "123456789", text: "A tutorial", author: { name: "Creator", userName: "creator" },
  extendedEntities: { media: [
    { type: "photo" },
    { type: "video", video_info: { duration_millis: 12000, variants: [
      { content_type: "application/x-mpegURL", url: "https://video.twimg.com/hls.m3u8" },
      { content_type: "video/mp4", bitrate: 256000, url: "https://video.twimg.com/low.mp4" },
      { content_type: "video/mp4", bitrate: 832000, url: "https://video.twimg.com/high.mp4" },
    ] } },
  ] },
};

function apify(items: unknown[], status = "SUCCEEDED") {
  const calls: any[] = [];
  const service = load("src/services/apifyScraper.ts", {
    "apify-client": { ApifyClient: class {
      actor(id: string) { return { call: async (input: unknown, options: unknown) => {
        calls.push({ id, input, options }); return { status, defaultDatasetId: "fixture" };
      } }; }
      dataset() { return { listItems: async () => ({ items }) }; }
    } },
    "fs/promises": {}, fs: {}, path: {},
    "../pipeline/types.js": { ServiceError },
    "./storage.js": {}, "../config.js": { config: {} },
  });
  return { service, calls };
}

test("X uses the single-post actor with one exact URL and bounded charging", async () => {
  const fixture = apify([video]);
  const result = await fixture.service.scrapeWithApify("x", sourceUrl);
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0].id, "apidojo/twitter-scraper-lite");
  assert.equal(JSON.stringify(fixture.calls[0].input), JSON.stringify({ startUrls: [sourceUrl], maxItems: 1 }));
  assert.equal(fixture.calls[0].options.maxItems, 1);
  assert.equal(fixture.calls[0].options.maxTotalChargeUsd, 0.10);
  assert.equal(result.apifyVideoUrl, "https://video.twimg.com/high.mp4");
  assert.equal(result.metadata.duration, 12);
  assert.equal(result.metadata.id, "123456789");
});

test("X refuses unrelated results and profile/search URLs before an actor job", async () => {
  const mismatch = apify([{ ...video, id: "999" }]);
  await assert.rejects(mismatch.service.scrapeWithApify("x", sourceUrl), (error: any) => error.code === "APIFY_NO_MATCH");
  for (const url of ["https://x.com/creator", "https://x.com/search?q=test", "https://evil.example/creator/status/123456789"]) {
    const fixture = apify([video]);
    await assert.rejects(fixture.service.scrapeWithApify("x", url), (error: any) => error.code === "NOT_A_VIDEO");
    assert.equal(fixture.calls.length, 0);
  }
});

test("X text/photo posts and unfinished provider runs cannot appear as video", async () => {
  const photo = apify([{ ...video, extendedEntities: { media: [{ type: "photo" }] } }]);
  await assert.rejects(photo.service.scrapeWithApify("x", sourceUrl), (error: any) => error.code === "NOT_A_VIDEO");
  const unfinished = apify([video], "RUNNING");
  await assert.rejects(unfinished.service.scrapeWithApify("x", sourceUrl), (error: any) => error.code === "APIFY_RUN_FAILED");
});

function scraper(stderr: string, alternate: () => Promise<any>) {
  let attempts = 0;
  const service = load("src/services/scraper.ts", {
    child_process: { execFile() {} },
    util: { promisify: () => async () => { attempts++; throw Object.assign(new Error("yt-dlp failed"), { stderr }); } },
    "../pipeline/types.js": { ServiceError },
    "./apifyScraper.js": { scrapeWithApify: alternate },
    "./mediaRuntime.js": { resolveYtDlpExecutable: () => "/maintained/yt-dlp" },
    "./ytDlpMetadata.js": ytDlpMetadata,
  });
  return { service, attempts: () => attempts };
}

test("X retrieval failures try the alternate video provider before text fallback", async () => {
  let calls = 0;
  const fixture = scraper("HTTP Error 403: Forbidden", async () => { calls++; return { metadata: { id: "123456789" }, apifyVideoUrl: "https://video.twimg.com/high.mp4" }; });
  const result = await fixture.service.scrapeVideoWithFallback("x", sourceUrl);
  assert.equal(calls, 1);
  assert.equal(fixture.attempts(), 3);
  assert.equal(result.apifyVideoUrl, "https://video.twimg.com/high.mp4");
});

test("known text-only X posts skip paid fallback; unavailable video is reported as text-only", async () => {
  const knownText = scraper("ERROR: No video could be found in this tweet", async () => { throw new Error("Must not call a paid actor"); });
  await assert.rejects(knownText.service.scrapeVideoWithFallback("x", sourceUrl), (error: any) => error.code === "NOT_A_VIDEO");
  assert.equal(knownText.attempts(), 1);
  const unavailable = scraper("Connection timed out", async () => { throw new ServiceError("APIFY_NOT_CONFIGURED", "inert"); });
  await assert.rejects(unavailable.service.scrapeVideoWithFallback("x", sourceUrl), (error: any) => error.code === "NOT_A_VIDEO" && /only public post text/.test(error.message));
});

test("provider content mismatch remains a hard failure instead of degrading to text", async () => {
  const fixture = scraper("HTTP Error 403", async () => { throw new ServiceError("APIFY_NO_MATCH", "wrong post"); });
  await assert.rejects(fixture.service.scrapeVideoWithFallback("x", sourceUrl), (error: any) => error.code === "APIFY_NO_MATCH");
});

test("capture and production share explicit, project-local, then PATH downloader resolution", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "contextdrop-runtime-test-"));
  try {
    assert.equal(resolveYtDlpExecutable(directory, {}), "yt-dlp");
    const executable = path.join(directory, ".contextdrop/media-runtime/bin/yt-dlp");
    await mkdir(path.dirname(executable), { recursive: true });
    await writeFile(executable, "offline fixture");
    assert.equal(resolveYtDlpExecutable(directory, {}), executable);
    assert.equal(resolveYtDlpExecutable(directory, { YTDLP_PATH: "/explicit/yt-dlp" }), "/explicit/yt-dlp");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
