import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

export type UploadKind = "video" | "audio" | "image" | "document" | "text";
export interface UploadManifest {
  version: 1; id: string; filename: string; mimeType: string; kind: UploadKind;
  bytes: number; sha256: string; extension: string; createdAt: string; question: string;
  durationSeconds?: number; pageCount?: number;
}
export class UploadError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
const MIB = 1024 * 1024;
const FORMATS: Record<string, [UploadKind, string]> = {
  mp4: ["video", "video/mp4"], mov: ["video", "video/mov"], webm: ["video", "video/webm"],
  mp3: ["audio", "audio/mpeg"], m4a: ["audio", "audio/mp4"], wav: ["audio", "audio/wav"], ogg: ["audio", "audio/ogg"],
  png: ["image", "image/png"], jpg: ["image", "image/jpeg"], jpeg: ["image", "image/jpeg"], webp: ["image", "image/webp"],
  pdf: ["document", "application/pdf"], txt: ["text", "text/plain"], md: ["text", "text/plain"], csv: ["text", "text/plain"], json: ["text", "text/plain"],
};
export function uploadOptions(filename: string, question = "") {
  if (!filename || filename.length > 240 || /[\x00-\x1f\x7f/\\]/.test(filename) || question.length > 2000) throw new UploadError("INVALID_UPLOAD", "Choose a file with a simple filename and a question under 2,000 characters.");
  const extension = filename.split(".").at(-1)?.toLowerCase() || "";
  const format = FORMATS[extension];
  if (!format) throw new UploadError("UNSUPPORTED_UPLOAD", "Upload a video, audio file, PNG/JPEG/WebP image, PDF, or UTF-8 text file.");
  const [kind, mimeType] = format;
  return { filename, question, extension, kind, mimeType, maxBytes: kind === "video" || kind === "audio" ? 200 * MIB : kind === "text" ? MIB : 20 * MIB };
}
export function validUploadId(id: unknown): id is string { return typeof id === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id); }
export function uploadSourceUrl(id: string) { if (!validUploadId(id)) throw new UploadError("INVALID_UPLOAD", "Unknown upload."); return `contextdrop://upload/${id}`; }
export async function atomicUploadJson(filename: string, value: unknown) {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try { await fs.writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600, flag: "wx" }); await fs.rename(temporary, filename); }
  finally { await fs.rm(temporary, { force: true }); }
}
export async function claimUploadOutput(filename: string): Promise<() => Promise<void>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const lock = await fs.open(filename, "wx", 0o600);
      try { await lock.writeFile(JSON.stringify({ processId: process.pid })); } finally { await lock.close(); }
      return () => fs.rm(filename, { force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const value = await fs.readFile(filename, "utf8").then(raw => JSON.parse(raw)).catch(() => null);
      if (Number.isInteger(value?.processId) && value.processId > 0) {
        try { process.kill(value.processId, 0); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === "ESRCH") { await fs.rm(filename); continue; } }
      }
      throw new UploadError("CAPTURE_ALREADY_RUNNING", "An upload capture already owns this output.", 409);
    }
  }
  throw new UploadError("CAPTURE_ALREADY_RUNNING", "The upload output could not be locked.", 409);
}

/** The HTTP body is streamed with an enforced byte limit, never buffered as unbounded multipart data. */
export async function receiveUpload(root: string, body: ReadableStream<Uint8Array> | null, filename: string, question = "", signal?: AbortSignal, claimedLength?: number): Promise<UploadManifest> {
  const options = uploadOptions(filename, question);
  if (claimedLength !== undefined && (!Number.isSafeInteger(claimedLength) || claimedLength <= 0 || claimedLength > options.maxBytes)) throw new UploadError("UPLOAD_TOO_LARGE", `Choose a file under ${options.maxBytes / MIB} MB.`, 413);
  if (!body) throw new UploadError("EMPTY_UPLOAD", "The selected file is empty.");
  const id = randomUUID();
  const directory = path.join(root, id);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const handle = await fs.open(path.join(directory, `source.${options.extension}`), "wx", 0o600);
  const reader = body.getReader();
  const abort = () => { void reader.cancel(signal?.reason).catch(() => {}); };
  signal?.addEventListener("abort", abort, { once: true });
  const hash = createHash("sha256");
  let bytes = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > options.maxBytes) throw new UploadError("UPLOAD_TOO_LARGE", `Choose a file under ${options.maxBytes / MIB} MB.`, 413);
      hash.update(value);
      await handle.writeFile(value);
    }
    if (!bytes || (claimedLength !== undefined && bytes !== claimedLength)) throw new UploadError("INCOMPLETE_UPLOAD", "The file transfer did not finish. Choose the file again.");
    const manifest: UploadManifest = { version: 1, id, filename, question, extension: options.extension, kind: options.kind, mimeType: options.mimeType, bytes, sha256: hash.digest("hex"), createdAt: new Date().toISOString() };
    await atomicUploadJson(path.join(directory, "manifest.json"), manifest);
    return manifest;
  } catch (error) { await reader.cancel().catch(() => {}); await handle.close(); await fs.rm(directory, { recursive: true, force: true }); throw error; }
  finally { signal?.removeEventListener("abort", abort); await handle.close().catch(() => {}); reader.releaseLock(); }
}

/** Only UUID-owned files under the configured upload root can be opened, including after a saved session is restored. */
export async function readUpload(root: string, id: string) {
  if (!validUploadId(id)) throw new UploadError("INVALID_UPLOAD", "Unknown upload.");
  const realRoot = await fs.realpath(root);
  const directory = await fs.realpath(path.join(root, id));
  if (directory !== path.join(realRoot, id)) throw new UploadError("INVALID_UPLOAD", "The stored upload path is invalid.");
  const manifestFile = path.join(directory, "manifest.json");
  if ((await fs.lstat(manifestFile)).isSymbolicLink() || (await fs.stat(manifestFile)).size > 10_000) throw new UploadError("INVALID_UPLOAD", "The stored upload manifest is invalid.");
  const manifest = JSON.parse(await fs.readFile(manifestFile, "utf8")) as UploadManifest;
  const options = uploadOptions(manifest.filename, manifest.question);
  if (manifest.id !== id || manifest.version !== 1 || options.extension !== manifest.extension || options.kind !== manifest.kind || options.mimeType !== manifest.mimeType || !Number.isSafeInteger(manifest.bytes) || manifest.bytes <= 0 || manifest.bytes > options.maxBytes || !/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new UploadError("INVALID_UPLOAD", "The stored upload identity is invalid.");
  const filename = await fs.realpath(path.join(directory, `source.${manifest.extension}`));
  if (filename !== path.join(directory, `source.${manifest.extension}`)) throw new UploadError("INVALID_UPLOAD", "The stored upload path is invalid.");
  const stat = await fs.stat(filename);
  if (!stat.isFile() || stat.size !== manifest.bytes) throw new UploadError("UPLOAD_CHANGED", "The saved file changed. Upload it again.");
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  if (hash.digest("hex") !== manifest.sha256) throw new UploadError("UPLOAD_CHANGED", "The saved file changed. Upload it again.");
  return { manifest, filename, directory };
}
