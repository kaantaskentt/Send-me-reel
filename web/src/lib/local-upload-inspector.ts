import { localProjectRoot } from "./local-studio";
import { runLocalJsonWorker } from "./local-json-worker";
import { parseUploadInspectionRequest, type UploadInspectionRequest, type UploadInspectionResponse, type UploadInspectionResult } from "../../../src/contracts/upload-inspection";

export async function inspectLocalUpload(options: UploadInspectionRequest & { apiKey: string; signal?: AbortSignal }): Promise<UploadInspectionResult> {
  if (process.env.NODE_ENV !== "development" || process.env.CONTEXTDROP_LOCAL_STUDIO !== "1") {
    throw new Error("Upload inspection is available only in the connected local studio.");
  }
  const { apiKey, signal, ...request } = options;
  if (!apiKey) throw new Error("Connect Gemini to inspect uploaded content.");
  const input = parseUploadInspectionRequest(request);
  // Native media dependencies stay in the root Mac runtime. No static import,
  // dynamic import, or type import of uploadedContent belongs in hosted web code.
  const output = await runLocalJsonWorker(process.execPath, ["--import", "tsx", "scripts/inspect-upload.ts"], input, {
    cwd: localProjectRoot, env: { ...process.env, GEMINI_API_KEY: apiKey }, signal,
    // The worker aborts active inspection at 160s. Gemini file deletion then
    // gets its independent 15s deadline, including when chat cancels earlier.
    timeoutMs: 180_000, terminationGraceMs: 20_000,
  }) as UploadInspectionResponse;
  if (!output || output.version !== 1 || typeof output.ok !== "boolean") throw new Error("Invalid local inspection response.");
  if (!output.ok) throw new Error(output.error?.message || "The uploaded content could not be inspected.");
  const result = output.result;
  if (!result || result.status !== "complete" || result.sourceUrl !== `contextdrop://upload/${input.uploadId}` || !Array.isArray(result.evidence?.observations)) {
    throw new Error("The local inspection returned evidence for an unexpected source.");
  }
  return result;
}
