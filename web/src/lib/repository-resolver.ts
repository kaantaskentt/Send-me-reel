/** Public, read-only GitHub lookups. Source identity and repository existence are separate facts. */
export interface RepositorySourceClue {
  text: string;
  source: "visual" | "transcript" | "caption";
  timestampSeconds?: number;
  frameId?: string;
}

export interface PublicRepository {
  url: string;
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  archived: boolean;
  defaultBranch: string;
  license: string | null;
}

export interface RepositoryResolution {
  existence: "verified" | "not_found" | "unavailable" | "invalid";
  sourceMatch: "confirmed" | "candidate" | "unknown";
  repository: PublicRepository | null;
  matchedClues: RepositorySourceClue[];
  reason: string;
  checkedAt: string;
}

export interface RepositorySearchResult {
  status: "ok" | "unavailable" | "invalid";
  candidates: PublicRepository[];
  reason: string;
}

interface LookupOptions {
  /** Dependency injection for offline tests; no caller-supplied headers or endpoint. */
  fetch?: typeof fetch;
  timeoutMs?: number;
}

const OWNER = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const NAME = /^[a-zA-Z0-9_.-]{1,100}$/;
const API_ORIGIN = "https://api.github.com";

function validParts(owner: string, name: string): boolean {
  return OWNER.test(owner) && NAME.test(name) && name !== "." && name !== "..";
}

/** Accept repository roots only, then construct the API path ourselves. */
export function normalizePublicRepositoryUrl(input: string): string | null {
  if (typeof input !== "string" || input.length > 500) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || !["github.com", "www.github.com"].includes(url.hostname) || url.username || url.password || url.port) return null;
    const parts = url.pathname.replace(/\/$/, "").split("/").slice(1);
    if (parts.length !== 2) return null;
    const [owner, rawName] = parts;
    const name = rawName.replace(/\.git$/, "");
    if (!validParts(owner, name)) return null;
    return `https://github.com/${owner}/${name}`;
  } catch { return null; }
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parseRepository(value: unknown): PublicRepository | null {
  const data = record(value);
  const owner = record(data?.owner)?.login;
  const name = data?.name;
  if (!data || typeof owner !== "string" || typeof name !== "string" || !validParts(owner, name)) return null;
  const fullName = `${owner}/${name}`;
  if (data.full_name !== fullName || data.private !== false || typeof data.archived !== "boolean" || typeof data.default_branch !== "string" || !data.default_branch || data.default_branch.length > 255) return null;
  const canonical = typeof data.html_url === "string" ? normalizePublicRepositoryUrl(data.html_url) : null;
  if (canonical !== `https://github.com/${fullName}`) return null;
  const license = record(data.license)?.spdx_id;
  return {
    url: canonical,
    fullName,
    owner,
    name,
    description: typeof data.description === "string" ? data.description.slice(0, 1_000) : null,
    archived: data.archived,
    defaultBranch: data.default_branch,
    license: typeof license === "string" && license !== "NOASSERTION" ? license.slice(0, 100) : null,
  };
}

async function readResponseJson(response: Response, byteLimit: number): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > byteLimit) throw new Error("Response exceeds limit");
  if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new Error("Expected JSON");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty response");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > byteLimit) { await reader.cancel(); throw new Error("Response exceeds limit"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function publicApiJson(path: string, byteLimit: number, options: LookupOptions): Promise<{ status: number; value?: unknown }> {
  const controller = new AbortController();
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, Math.min(options.timeoutMs!, 8_000)) : 5_000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const response = await (options.fetch ?? fetch)(`${API_ORIGIN}${path}`, {
          method: "GET",
          headers: { Accept: "application/vnd.github+json", "User-Agent": "ContextDrop-RepositoryResolver", "X-GitHub-Api-Version": "2022-11-28" },
          credentials: "omit",
          referrerPolicy: "no-referrer",
          redirect: "error",
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status !== 200) { await response.body?.cancel(); return { status: response.status }; }
        return { status: response.status, value: await readResponseJson(response, byteLimit) };
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("Lookup timed out")); }, timeoutMs); }),
    ]);
  } finally { if (timer) clearTimeout(timer); controller.abort(); }
}

function exactClues(clues: RepositorySourceClue[], repository: PublicRepository): RepositorySourceClue[] {
  const escaped = repository.fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const root = `(?:https?:\\/\\/)?(?:www\\.)?github\\.com\\/${escaped}`;
  const urlMatch = new RegExp(`(^|[\\s(\\[\"'])${root}(?:\\.git)?(?=$|[\\s/)?#\\],\"'])`, "i");
  const pairMatch = new RegExp(`(^|[\\s(\\[\"'])${escaped}(?=$|[\\s)\\],\"'])`, "i");
  const matches: RepositorySourceClue[] = [];
  let remainingCharacters = 2_000_000;
  // Do not discard a later frame or the transcript/caption that follows the frame list.
  // Search literal identifiers locally; return only compact matching source excerpts.
  for (const clue of clues.slice(0, 2_000)) {
    if (!clue || !["visual", "transcript", "caption"].includes(clue.source) || typeof clue.text !== "string") continue;
    if (clue.timestampSeconds !== undefined && (!Number.isFinite(clue.timestampSeconds) || clue.timestampSeconds < 0)) continue;
    if (remainingCharacters <= 0 || matches.length >= 5) break;
    const text = clue.text.slice(0, remainingCharacters);
    remainingCharacters -= text.length;
    const match = urlMatch.exec(text) ?? pairMatch.exec(text);
    if (!match) continue;
    matches.push({
      text: text.slice(Math.max(0, match.index - 160), match.index + match[0].length + 160),
      source: clue.source,
      ...(clue.timestampSeconds !== undefined ? { timestampSeconds: clue.timestampSeconds } : {}),
      ...(typeof clue.frameId === "string" ? { frameId: clue.frameId.slice(0, 200) } : {}),
    });
  }
  return matches;
}

export async function verifyPublicRepository(proposedUrl: string, sourceClues: RepositorySourceClue[] = [], options: LookupOptions = {}): Promise<RepositoryResolution> {
  const checkedAt = new Date().toISOString();
  const unresolved = (existence: RepositoryResolution["existence"], reason: string): RepositoryResolution => ({ existence, sourceMatch: "unknown", repository: null, matchedClues: [], reason, checkedAt });
  const canonical = normalizePublicRepositoryUrl(proposedUrl);
  if (!canonical) return unresolved("invalid", "Use a public HTTPS GitHub repository URL with an owner and repository name.");
  const fullName = canonical.slice("https://github.com/".length);
  try {
    const result = await publicApiJson(`/repos/${fullName}`, 64_000, options);
    if (result.status === 404) return unresolved("not_found", "GitHub did not return a public repository at this address.");
    if (result.status !== 200) return unresolved("unavailable", "GitHub could not complete this public lookup. The repository has not been verified.");
    const repository = parseRepository(result.value);
    if (!repository || repository.fullName.toLowerCase() !== fullName.toLowerCase()) return unresolved("unavailable", "GitHub returned an unexpected repository identity. No match was confirmed.");
    const matchedClues = exactClues(Array.isArray(sourceClues) ? sourceClues : [], repository);
    return {
      existence: "verified",
      sourceMatch: matchedClues.length ? "confirmed" : "candidate",
      repository,
      matchedClues,
      reason: matchedClues.length ? "This public repository exists and its exact owner/name appears in the supplied source evidence." : "This public repository exists. The available source evidence does not confirm it is the one shown or discussed.",
      checkedAt,
    };
  } catch { return unresolved("unavailable", "The public GitHub lookup failed or exceeded its limits. No match was confirmed."); }
}

/** The caller must supply text actually observed in the source. Search candidates are never identity confirmations. */
export async function searchPublicRepositories(clue: string, options: LookupOptions = {}): Promise<RepositorySearchResult> {
  if (typeof clue !== "string" || clue.trim().length < 3 || clue.length > 160 || /[\u0000-\u001f]/.test(clue)) return { status: "invalid", candidates: [], reason: "Provide a short repository name or phrase observed in the source." };
  // Strip query operators supplied by model/source text; only our fixed public repository search can run.
  const words = clue.replace(/[^a-zA-Z0-9_. -]/g, " ").trim().split(/\s+/).filter(Boolean).slice(0, 8);
  if (!words.length) return { status: "invalid", candidates: [], reason: "No searchable source clue was supplied." };
  const query = `${words.map((word) => `"${word}"`).join(" ")} in:name,description,readme is:public`;
  try {
    const result = await publicApiJson(`/search/repositories?${new URLSearchParams({ q: query, per_page: "5" })}`, 256_000, options);
    const data = record(result.value);
    if (result.status !== 200 || !Array.isArray(data?.items)) return { status: "unavailable", candidates: [], reason: "GitHub search is unavailable or rate limited." };
    const candidates = data.items.slice(0, 5).map(parseRepository).filter((item): item is PublicRepository => Boolean(item));
    return { status: "ok", candidates, reason: candidates.length ? "These are public search candidates. Compare their identity with the source before using them." : "No matching public repository was found for this clue." };
  } catch { return { status: "unavailable", candidates: [], reason: "The public search failed or exceeded its limits." }; }
}
