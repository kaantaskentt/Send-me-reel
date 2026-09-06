import { lookup as dnsLookup } from "node:dns/promises";
import { resolvePublicUrl } from "../../src/services/publicUrl.js";
import { parseSourceUrl } from "../../src/pipeline/urlRouter.js";
import { normalizePublicRepositoryUrl, verifyPublicRepository, type PublicRepository } from "../../web/src/lib/repository-resolver.js";

export const MAX_PAGE_TEXT_CHARACTERS = 60_000;
export const MAX_PAGE_RESPONSE_BYTES = 512_000;

export class PageCaptureError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = "PageCaptureError"; }
}

export interface CapturedPage {
  url: string;
  title: string;
  text: string;
  mediaKind: "article" | "repository";
  provider: "jina_reader" | "github_api";
  coverage: "reader_extract" | "readme";
  truncated: boolean;
  warnings: string[];
  repository?: PublicRepository;
}

interface CaptureOptions {
  fetch?: typeof fetch;
  lookup?: typeof dnsLookup;
  timeoutMs?: number;
}

/** DNS validation occurs before the fixed third-party reader is given any target URL. */
export async function validatePublicPageUrl(input: string, lookup?: typeof dnsLookup): Promise<URL> {
  const parsed = typeof input === "string" ? parseSourceUrl(input) : null;
  if (!parsed || parsed.protocol !== "https:") throw new PageCaptureError("PAGE_URL_INVALID", "Use a public HTTPS website without credentials, a custom port, or a local address.");
  try { await resolvePublicUrl(parsed.href, lookup); }
  catch { throw new PageCaptureError("PAGE_URL_INVALID", "The website did not resolve to a public network address."); }
  parsed.hash = "";
  return parsed;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

async function boundedJson(response: Response): Promise<unknown> {
  if (response.status !== 200) { await response.body?.cancel(); throw new PageCaptureError("PAGE_FETCH_FAILED", "The public source reader could not retrieve this page."); }
  if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new PageCaptureError("PAGE_FETCH_FAILED", "The public source reader returned an unsupported response.");
  if (Number(response.headers.get("content-length")) > MAX_PAGE_RESPONSE_BYTES) throw new PageCaptureError("PAGE_CONTENT_TOO_LARGE", "The page is larger than this capture can read.");
  const reader = response.body?.getReader();
  if (!reader) throw new PageCaptureError("PAGE_EMPTY", "No readable page content was returned.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PAGE_RESPONSE_BYTES) { await reader.cancel(); throw new PageCaptureError("PAGE_CONTENT_TOO_LARGE", "The page is larger than this capture can read."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const content = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
  try { return JSON.parse(content); }
  catch { throw new PageCaptureError("PAGE_FETCH_FAILED", "The public source reader returned invalid page data."); }
}

function textSnapshot(text: string): { text: string; truncated: boolean } {
  const cleaned = text.replace(/\u0000/g, "").trim();
  if (cleaned.length < 30) throw new PageCaptureError("PAGE_EMPTY", "The source did not contain enough readable text. It may require signing in or interactive navigation.");
  return { text: cleaned.slice(0, MAX_PAGE_TEXT_CHARACTERS), truncated: cleaned.length > MAX_PAGE_TEXT_CHARACTERS };
}

/** Egress is limited to api.github.com and r.jina.ai. Never fetch the source URL directly from this Mac. */
export async function capturePublicPage(input: string, options: CaptureOptions = {}): Promise<CapturedPage> {
  const fetcher = options.fetch ?? fetch;
  const controller = new AbortController();
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, Math.min(options.timeoutMs!, 90_000)) : 90_000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const requestJson = (url: string, headers: Record<string, string>) => fetcher(url, {
    method: "GET", headers, signal: controller.signal, redirect: "error", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer",
  }).then(boundedJson);
  try {
    return await Promise.race([
      (async (): Promise<CapturedPage> => {
        const source = await validatePublicPageUrl(input, options.lookup);
        controller.signal.throwIfAborted();
        const repoUrl = normalizePublicRepositoryUrl(source.href);
        if (repoUrl) {
          const result = await verifyPublicRepository(repoUrl, [], { fetch: fetcher, timeoutMs: Math.min(timeoutMs, 5_000) });
          controller.signal.throwIfAborted();
          if (result.existence !== "verified" || !result.repository) throw new PageCaptureError("PAGE_FETCH_FAILED", "This public GitHub repository could not be verified.");
          const repository = result.repository;
          const endpoint = `https://api.github.com/repos/${repository.fullName}/readme?${new URLSearchParams({ ref: repository.defaultBranch })}`;
          const raw = asRecord(await requestJson(endpoint, { Accept: "application/vnd.github+json", "User-Agent": "ContextDrop-PageCapture", "X-GitHub-Api-Version": "2022-11-28" }));
          if (raw?.encoding !== "base64" || typeof raw.content !== "string" || !/^[a-zA-Z0-9+/=\r\n]+$/.test(raw.content)) throw new PageCaptureError("PAGE_EMPTY", "GitHub did not return a readable repository README.");
          const snapshot = textSnapshot(Buffer.from(raw.content, "base64").toString("utf8"));
          const warnings = ["Captured the public repository README and metadata. Repository code was not executed, installed, or visually inspected."];
          if (snapshot.truncated) warnings.push(`Only the first ${MAX_PAGE_TEXT_CHARACTERS.toLocaleString("en-US")} README characters were retained.`);
          return { url: repository.url, title: repository.fullName, ...snapshot, mediaKind: "repository", provider: "github_api", coverage: "readme", warnings, repository };
        }

        // Jina is a separate network boundary. DNS checks here do not claim to pin its downstream connection.
        const raw = asRecord(await requestJson(`https://r.jina.ai/${source.href}`, { Accept: "application/json", "X-Return-Format": "markdown", "X-Timeout": "45" }));
        const data = asRecord(raw?.data);
        if (!data || typeof data.content !== "string" || (typeof raw?.code === "number" && raw.code !== 200)) throw new PageCaptureError("PAGE_FETCH_FAILED", "The public reader could not extract this website's content.");
        if (typeof data.url === "string") await validatePublicPageUrl(data.url, options.lookup);
        const snapshot = textSnapshot(data.content);
        const warnings = ["Captured readable website text through Jina Reader. Images, interactive behavior, and linked pages were not analyzed."];
        if (snapshot.truncated) warnings.push(`Only the first ${MAX_PAGE_TEXT_CHARACTERS.toLocaleString("en-US")} page characters were retained.`);
        return { url: source.href, title: typeof data.title === "string" && data.title.trim() ? data.title.trim().slice(0, 300) : source.hostname, ...snapshot, mediaKind: "article", provider: "jina_reader", coverage: "reader_extract", warnings };
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new PageCaptureError("CAPTURE_TIMEOUT", "Page capture timed out. No task was started.")); }, timeoutMs); }),
    ]);
  } catch (error) {
    if (error instanceof PageCaptureError) throw error;
    throw new PageCaptureError("PAGE_FETCH_FAILED", "The public page reader could not finish this capture.");
  } finally { if (timer) clearTimeout(timer); controller.abort(); }
}
