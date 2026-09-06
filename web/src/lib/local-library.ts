import { constants, promises as fs } from "node:fs";
import path from "node:path";

const ID = /^[a-zA-Z0-9-]{1,80}$/;
const MAX_CAPTURE_BYTES = 4_000_000;
export interface LibraryItem { analysisId: string; title: string; platform: string; createdAt: string; completedAt: string | null }
type Capture = { id: string; status: string; source_url: string; platform?: string; created_at?: string; completed_at?: string | null; caption?: string | null; metadata?: Record<string, unknown> | null; frame_descriptions: unknown[] | null };

export class LocalLibraryError extends Error {
  constructor(message: string, public status: 400 | 404 | 409) { super(message); }
}

/** Legacy URLs remain supported; new clients bind every image to its source. */
export function frameSourceMatches(parameters: URLSearchParams, analysisId: string): boolean {
  const requested = parameters.getAll("analysisId");
  return requested.length === 0 || (requested.length === 1 && ID.test(requested[0]) && requested[0] === analysisId);
}

export function requestedLibraryId(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LocalLibraryError("Choose a saved source.", 400);
  const body = value as Record<string, unknown>;
  if (Object.keys(body).length !== 1 || typeof body.analysisId !== "string" || !ID.test(body.analysisId)) throw new LocalLibraryError("Choose a saved source.", 400);
  return body.analysisId;
}

async function captureFile(root: string, filename: string, expectedId?: string): Promise<Capture | null> {
  let handle;
  try {
    const rootPath = await fs.realpath(root);
    const directory = await fs.realpath(path.dirname(filename));
    if (directory !== rootPath && !directory.startsWith(rootPath + path.sep)) return null;
    handle = await fs.open(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stats = await handle.stat();
    if (!stats.isFile() || stats.size > MAX_CAPTURE_BYTES) return null;
    const bytes = await handle.readFile();
    if (bytes.byteLength > MAX_CAPTURE_BYTES) return null;
    const capture = JSON.parse(bytes.toString("utf8"));
    if (!capture || typeof capture !== "object" || typeof capture.id !== "string" || !ID.test(capture.id) || (expectedId && capture.id !== expectedId) || typeof capture.source_url !== "string" || typeof capture.status !== "string" || (capture.frame_descriptions !== null && !Array.isArray(capture.frame_descriptions))) return null;
    return capture as Capture;
  } catch { return null; }
  finally { await handle?.close(); }
}

function item(capture: Capture): LibraryItem {
  const title = capture.metadata?.title;
  return {
    analysisId: capture.id,
    title: (typeof title === "string" ? title : typeof capture.caption === "string" ? capture.caption : "Saved content").slice(0, 200),
    platform: typeof capture.platform === "string" ? capture.platform.slice(0, 40) : "web",
    createdAt: typeof capture.created_at === "string" ? capture.created_at.slice(0, 40) : "",
    completedAt: typeof capture.completed_at === "string" ? capture.completed_at.slice(0, 40) : null,
  };
}

export async function listLocalLibrary(root: string): Promise<{ currentAnalysisId: string | null; items: LibraryItem[] }> {
  const current = await captureFile(root, path.join(root, "local-analysis.json"));
  const sources = new Map<string, LibraryItem>();
  let entries: string[] = [];
  try { entries = (await fs.readdir(path.join(root, "library"))).filter(name => name.endsWith(".json") && ID.test(name.slice(0, -5))).sort().slice(0, 200); } catch { /* no archive yet */ }
  for (const filename of entries) {
    const capture = await captureFile(root, path.join(root, "library", filename), filename.slice(0, -5));
    if (capture?.status === "done") sources.set(capture.id, item(capture));
  }
  if (current?.status === "done") sources.set(current.id, item(current));
  const items = [...sources.values()].sort((a, b) => a.analysisId === current?.id ? -1 : b.analysisId === current?.id ? 1 : (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt)).slice(0, 200);
  return { currentAnalysisId: current?.id ?? null, items };
}

async function atomicJson(filename: string, value: Capture) {
  const temporary = `${filename}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: "wx" });
    await fs.rename(temporary, filename);
  } finally { await fs.unlink(temporary).catch(() => {}); }
}

export async function activateLocalSource(root: string, analysisId: string): Promise<{ analysisId: string; status: "done" }> {
  if (!ID.test(analysisId)) throw new LocalLibraryError("Choose a saved source.", 400);
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const lockPath = path.join(root, "capture-launch.lock");
  let lock;
  try { lock = await fs.open(lockPath, "wx", 0o600); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new LocalLibraryError("A source is starting or switching. Try again shortly.", 409);
    throw error;
  }
  try {
    const checkpoint = path.join(root, "local-analysis.json");
    const current = await captureFile(root, checkpoint);
    if (!current && await fs.lstat(checkpoint).then(() => true, () => false)) throw new LocalLibraryError("The current capture could not be read. It was preserved.", 409);
    if (current && !["done", "failed"].includes(current.status)) throw new LocalLibraryError("Wait for the current capture to finish before switching sources.", 409);
    if (current?.id === analysisId && current.status === "done") return { analysisId, status: "done" };
    const library = path.join(root, "library");
    const selected = await captureFile(root, path.join(library, `${analysisId}.json`), analysisId);
    if (!selected || selected.status !== "done") throw new LocalLibraryError("This completed source is no longer in the local library.", 404);
    await fs.mkdir(library, { recursive: true, mode: 0o700 });
    if (await fs.realpath(library) !== path.join(await fs.realpath(root), "library")) throw new LocalLibraryError("The local library directory is invalid.", 409);
    if (current?.status === "done") await atomicJson(path.join(library, `${current.id}.json`), current);
    await atomicJson(checkpoint, selected);
    return { analysisId, status: "done" };
  } finally { await lock.close(); await fs.unlink(lockPath).catch(() => {}); }
}
