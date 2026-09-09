import "dotenv/config";
import path from "node:path";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { captureUploadedContent } from "../src/services/uploadedContent.js";
import { atomicUploadJson, claimUploadOutput, readUpload, UploadError, uploadSourceUrl, validUploadId } from "../src/services/uploadStore.js";
import { GeminiVideoError } from "../src/services/geminiVideo.js";

export function uploadCaptureOptions(argv: string[]) {
  if (argv.includes("--help")) return null;
  const id = argv[0];
  if (!validUploadId(id)) throw new UploadError("INVALID_UPLOAD", "Choose a stored upload.");
  let output = path.resolve(".contextdrop/local-analysis.json");
  let uploadRoot = path.resolve(".contextdrop/uploads");
  for (let index = 1; index < argv.length; index += 2) {
    const value = argv[index + 1];
    if (!value) throw new UploadError("INVALID_UPLOAD", "Missing upload option.");
    if (argv[index] === "--output") output = path.resolve(value);
    else if (argv[index] === "--upload-root") uploadRoot = path.resolve(value);
    else throw new UploadError("INVALID_UPLOAD", "Unknown upload option.");
  }
  return { id, output, uploadRoot };
}
export async function main(argv = process.argv.slice(2)) {
  const options = uploadCaptureOptions(argv);
  if (!options) { console.log("Usage: tsx scripts/capture-upload.ts UPLOAD_UUID [--output PATH] [--upload-root PATH]"); return; }
  await fs.mkdir(path.dirname(options.output), { recursive: true, mode: 0o700 });
  const release = await claimUploadOutput(`${options.output}.upload.lock`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException("Capture timeout", "TimeoutError")), 1800_000);
  let last: Record<string, any> | undefined;
  try {
    await captureUploadedContent({ uploadRoot: options.uploadRoot, uploadId: options.id, apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "", model: process.env.CONTEXTDROP_GEMINI_VIDEO_MODEL, signal: controller.signal,
      onCheckpoint: async analysis => { last = analysis; await atomicUploadJson(options.output, analysis); },
    });
    console.log(JSON.stringify({ status: "done", id: options.id, sourceUrl: uploadSourceUrl(options.id), kind: last?.metadata.upload.kind }));
  } catch (error) {
    const code = error instanceof UploadError || error instanceof GeminiVideoError ? error.code : controller.signal.aborted ? "CAPTURE_TIMEOUT" : "UPLOAD_ANALYSIS_FAILED";
    if (!last) {
      const stored = await readUpload(options.uploadRoot, options.id).catch(() => undefined);
      await atomicUploadJson(options.output, { id: options.id, source_url: uploadSourceUrl(options.id), title: stored?.manifest.filename || "Uploaded content", status: "failed", frame_descriptions: [], created_at: new Date().toISOString(), error_message: "This uploaded file could not be read.", metadata: { upload: stored?.manifest, local_capture: { stage: "failed", errorCode: code } } });
    }
    console.error(JSON.stringify({ status: "failed", code, id: options.id })); process.exitCode = 1;
  } finally { clearTimeout(timeout); await release(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(() => { console.error("Upload capture could not start."); process.exitCode = 1; });
