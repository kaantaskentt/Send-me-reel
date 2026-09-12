import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseUploadInspectionRequest, type UploadInspectionResponse } from "../src/contracts/upload-inspection.js";
import { inspectUploadedContent } from "../src/services/uploadedContent.js";
import { UploadError } from "../src/services/uploadStore.js";
import { GeminiVideoError } from "../src/services/geminiVideo.js";

/** One JSON request on stdin, one JSON response on stdout. Secrets stay in env. */
export async function main() {
  const controller = new AbortController();
  const abort = () => { controller.abort(); process.stdin.destroy(); };
  process.once("SIGTERM", abort);
  process.once("SIGINT", abort);
  const timer = setTimeout(abort, 160_000);
  let response: UploadInspectionResponse;
  try {
    if (process.env.NODE_ENV !== "development" || process.env.CONTEXTDROP_LOCAL_STUDIO !== "1") throw new Error("Local runtime disabled");
    const chunks: Buffer[] = [];
    let length = 0;
    for await (const chunk of process.stdin) {
      length += chunk.length;
      if (length > 16_384) throw new Error("Oversized request");
      chunks.push(Buffer.from(chunk));
    }
    const request = parseUploadInspectionRequest(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!path.isAbsolute(request.uploadRoot)) throw new Error("Absolute upload root required");
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing reader configuration");
    const result = await inspectUploadedContent({ ...request, apiKey, model: process.env.CONTEXTDROP_GEMINI_VIDEO_MODEL, signal: controller.signal });
    response = { version: 1, ok: true, result };
  } catch (error) {
    const known = error instanceof UploadError || error instanceof GeminiVideoError;
    response = { version: 1, ok: false, error: {
      code: known ? error.code : controller.signal.aborted ? "INSPECTION_CANCELLED" : "INSPECTION_FAILED",
      message: known ? error.message : "The local inspection could not finish. Your source is preserved.",
    } };
  } finally {
    clearTimeout(timer);
    process.removeListener("SIGTERM", abort);
    process.removeListener("SIGINT", abort);
  }
  process.stdout.write(JSON.stringify(response) + "\n");
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => { process.stderr.write("The local inspection worker could not finish.\n"); process.exitCode = 1; });
}
