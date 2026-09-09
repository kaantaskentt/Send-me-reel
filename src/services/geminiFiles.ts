import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { GeminiVideoError, readGeminiBoundedJson } from "./geminiVideo.js";

const ORIGIN = "https://generativelanguage.googleapis.com";
interface GeminiFile { name: string; uri: string; mimeType: string; state: string }
export interface GeminiFileOptions { apiKey: string; signal?: AbortSignal; fetchImpl?: typeof fetch }
function fileInfo(value: unknown): GeminiFile {
  const file = value as GeminiFile;
  if (!file || !/^files\/[a-zA-Z0-9_-]+$/.test(file.name) || file.uri !== `${ORIGIN}/v1beta/${file.name}` || typeof file.mimeType !== "string" || !["PROCESSING", "ACTIVE", "FAILED"].includes(file.state)) throw new GeminiVideoError("INVALID_PROVIDER_FILE", "Gemini returned an invalid file reference");
  return file;
}
async function checked(response: Response) {
  if (!response.ok) { await response.body?.cancel(); throw new GeminiVideoError(`GEMINI_HTTP_${response.status}`, `Gemini request failed with HTTP ${response.status}`); }
  return readGeminiBoundedJson(response);
}
async function pause(milliseconds: number, signal?: AbortSignal) {
  signal?.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal?.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, milliseconds);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

/** A provider file is used only inside this scope; deletion gets its own deadline even after capture cancellation. */
export async function withGeminiFile<T>(filename: string, mimeType: string, options: GeminiFileOptions, use: (file: { fileUri: string; mimeType: string }) => Promise<T>, onCleanup?: (deleted: boolean) => Promise<void>): Promise<T> {
  if (!options.apiKey?.trim()) throw new GeminiVideoError("GEMINI_NOT_CONFIGURED", "Gemini is not configured in this project");
  const fetcher = options.fetchImpl || fetch;
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(180_000)]) : AbortSignal.timeout(180_000);
  const size = (await fs.stat(filename)).size;
  let file: GeminiFile | undefined;
  try {
    const start = await fetcher(`${ORIGIN}/upload/v1beta/files`, {
      method: "POST", redirect: "error", signal,
      headers: { "x-goog-api-key": options.apiKey, "Content-Type": "application/json", "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": String(size), "X-Goog-Upload-Header-Content-Type": mimeType },
      body: JSON.stringify({ file: { display_name: "ContextDrop temporary source" } }),
    });
    if (!start.ok) { await start.body?.cancel(); throw new GeminiVideoError(`GEMINI_HTTP_${start.status}`, "Gemini could not start the file upload"); }
    const target = start.headers.get("x-goog-upload-url") || "";
    await start.body?.cancel();
    const url = new URL(target);
    if (url.origin !== ORIGIN || url.username || url.password || !url.pathname.startsWith("/upload/")) throw new GeminiVideoError("INVALID_PROVIDER_UPLOAD", "Gemini returned an unexpected upload destination");
    const stream = createReadStream(filename);
    let response;
    try {
      response = await fetcher(url.href, { method: "POST", redirect: "error", signal, headers: { "Content-Type": mimeType, "Content-Length": String(size), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" }, body: Readable.toWeb(stream) as ReadableStream, duplex: "half" } as RequestInit);
    } finally { stream.destroy(); }
    const uploaded = await checked(response) as { file?: unknown };
    file = fileInfo(uploaded.file);
    while (file.state === "PROCESSING") {
      await pause(2_000, signal);
      file = fileInfo(await checked(await fetcher(`${ORIGIN}/v1beta/${file.name}`, { redirect: "error", signal, headers: { "x-goog-api-key": options.apiKey } })));
    }
    if (file.state !== "ACTIVE") throw new GeminiVideoError("PROVIDER_FILE_FAILED", "Gemini could not process this file");
    if (file.mimeType !== mimeType) throw new GeminiVideoError("PROVIDER_FILE_MISMATCH", "Gemini read a different file format than expected");
    return await use({ fileUri: file.uri, mimeType });
  } finally {
    if (file) {
      let deleted = false;
      try { const response = await fetcher(`${ORIGIN}/v1beta/${file.name}`, { method: "DELETE", redirect: "error", signal: AbortSignal.timeout(15_000), headers: { "x-goog-api-key": options.apiKey } }); deleted = response.ok || response.status === 404; await response.body?.cancel(); } catch { /* The Files API expires unfinished cleanup after 48 hours. */ }
      await onCleanup?.(deleted);
    }
  }
}
