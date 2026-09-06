/** Capture public text evidence locally; no database, provider key, or code execution. */
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { capturePublicPage, PageCaptureError, type CapturedPage } from "./lib/page-capture.js";

export function pageCaptureOptions(argv: string[]) {
  if (argv.includes("--help") || argv.includes("-h")) return null;
  const url = argv[0];
  if (!url) throw new Error("Supply a public HTTPS website or GitHub repository URL.");
  let output = path.resolve(".contextdrop/local-analysis.json");
  let timeoutSeconds = 90;
  for (let index = 1; index < argv.length; index += 2) {
    if (!argv[index + 1]) throw new Error(`Missing value for ${argv[index]}`);
    if (argv[index] === "--output") output = path.resolve(argv[index + 1]);
    else if (argv[index] === "--timeout-seconds") timeoutSeconds = Number(argv[index + 1]);
    else throw new Error(`Unknown option ${argv[index]}`);
  }
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 90) throw new Error("Timeout must be between 1 and 90 seconds.");
  return { url, output, timeoutSeconds };
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const input = pageCaptureOptions(argv);
  if (!input) { console.log("Usage: npx tsx scripts/capture-page.ts URL [--output .contextdrop/local-analysis.json] [--timeout-seconds 90]"); return; }
  const startedAt = new Date().toISOString();
  const id = randomUUID();
  const analysis = {
    id, user_id: "local", source_url: input.url, platform: "article", status: "scraping",
    transcript: null, frame_descriptions: [], visual_summary: null, caption: null as string | null, title: null as string | null,
    verdict: null, verdict_intent: null, credits_charged: 0, error_message: null as string | null, action_items: null,
    created_at: startedAt, completed_at: null as string | null,
    metadata: {
      capture_mode: "local", database_writes: false, title: null as string | null, repository: undefined as CapturedPage["repository"],
      source_evidence: { version: 1, media_kind: "article", capture_complete: false, warnings: [] as string[], text: { status: "pending", characters: 0, coverage: "reader_extract", truncated: false }, transcript: { status: "not_applicable", timing: "none", characters: 0 }, visuals: { status: "not_applicable", extracted_frames: 0, analyzed_frames: 0 } },
      local_evidence: { framePaths: [], timestampsSec: [], capturedAt: startedAt, sourceUrl: input.url },
      local_capture: { startedAt, timeoutSeconds: input.timeoutSeconds, stage: "page_capture", processId: process.pid, errorCode: null as string | null },
    },
  };
  const directory = path.dirname(input.output);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const save = async () => {
    const temporary = `${input.output}.${id}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(analysis, null, 2) + "\n", { mode: 0o600 });
    await fs.rename(temporary, input.output);
  };
  await save();
  try {
    const result = await capturePublicPage(input.url, { timeoutMs: input.timeoutSeconds * 1000 });
    analysis.source_url = result.url;
    analysis.title = result.title;
    analysis.metadata.title = result.title;
    analysis.caption = result.text;
    analysis.status = "done";
    analysis.completed_at = new Date().toISOString();
    Object.assign(analysis.metadata.source_evidence, { media_kind: result.mediaKind, capture_complete: true, scrape_provider: result.provider, warnings: result.warnings, text: { status: "available", characters: result.text.length, coverage: result.coverage, truncated: result.truncated } });
    Object.assign(analysis.metadata.local_evidence, { sourceUrl: result.url });
    Object.assign(analysis.metadata.local_capture, { stage: "complete", completedAt: analysis.completed_at });
    if (result.repository) analysis.metadata.repository = result.repository;
    await save();
    console.log(JSON.stringify({ status: "done", output: input.output, media_kind: result.mediaKind, provider: result.provider, text_characters: result.text.length, truncated: result.truncated, database_writes: false }));
  } catch (error) {
    analysis.status = "failed";
    analysis.error_message = error instanceof PageCaptureError ? error.message : "Page capture did not finish.";
    analysis.metadata.local_capture.errorCode = error instanceof PageCaptureError ? error.code : "PAGE_FETCH_FAILED";
    analysis.metadata.local_capture.stage = "failed";
    analysis.metadata.source_evidence.text.status = "failed";
    await save();
    console.error(JSON.stringify({ status: "failed", code: analysis.metadata.local_capture.errorCode, error: analysis.error_message, database_writes: false }));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(() => { console.error("Page capture could not start. Check its arguments and local output directory."); process.exitCode = 1; });
