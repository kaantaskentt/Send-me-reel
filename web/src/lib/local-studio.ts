import { promises as fs } from "node:fs";
import path from "node:path";
import type { Analysis } from "./types";
import { parseReplicationPlan } from "./execution-plan";

export function isLocalStudioRequest(headers: Pick<Headers, "get">, mutation = false, env = process.env): boolean {
  if (env.NODE_ENV !== "development" || env.CONTEXTDROP_LOCAL_STUDIO !== "1") return false;
  const host = headers.get("host") || "";
  if (!/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host)) return false;
  if (headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = headers.get("origin");
  if (mutation && origin !== `http://${host}`) return false;
  if (origin && origin !== `http://${host}`) return false;
  return true;
}

// This development-only runtime directory must not be statically traced into a deployment.
export const localProjectRoot = path.resolve(/* turbopackIgnore: true */ process.cwd(), path.basename(process.cwd()) === "web" ? ".." : ".");
export const localStudioRoot = path.join(localProjectRoot, ".contextdrop");

export async function readLocalAnalysis(includePending = false): Promise<Analysis | null> {
  try {
    const filename = path.join(localStudioRoot, "local-analysis.json");
    const stats = await fs.stat(filename);
    if (stats.size > 4_000_000) return null;
    const value = JSON.parse(await fs.readFile(filename, "utf8"));
    if (!value || typeof value !== "object" || typeof value.id !== "string" || typeof value.source_url !== "string") return null;
    if ((!includePending && value.status !== "done") || (value.frame_descriptions !== null && !Array.isArray(value.frame_descriptions))) return null;
    return value as Analysis;
  } catch { return null; }
}

export function validateLocalSourceUrl(input: unknown): string {
  if (typeof input !== "string" || input.length > 2_048) throw new Error("Paste a public video link.");
  const url = new URL(input.trim());
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("Use a public HTTPS social video link.");
  const host = url.hostname.toLowerCase();
  const domains = ["youtube.com", "youtu.be", "instagram.com", "tiktok.com", "x.com", "twitter.com"];
  if (!domains.some(domain => host === domain || host.endsWith(`.${domain}`))) throw new Error("Local video capture currently accepts YouTube, Instagram, TikTok, and X links.");
  return url.href;
}

export async function readLocalPlan(analysis: Analysis) {
  try {
    const plan = parseReplicationPlan(JSON.parse(await fs.readFile(path.join(localStudioRoot, "local-plan.json"), "utf8")));
    return plan.analysisId === analysis.id && plan.sourceUrl === analysis.source_url ? plan : undefined;
  } catch { return undefined; }
}

export async function readLocalCompanionToken(host: string): Promise<string | undefined> {
  try {
    const session = JSON.parse(await fs.readFile(path.join(localStudioRoot, "companion-session.json"), "utf8"));
    if (session.origin !== `http://${host}` || typeof session.token !== "string" || session.token.length < 32 || !Number.isInteger(session.processId) || session.processId <= 0) return undefined;
    process.kill(session.processId, 0);
    return session.token;
  } catch { return undefined; }
}

export async function readLocalResult(analysisId: string): Promise<{ title: string; url: string; checks: string[]; verifiedAt: string } | null> {
  try {
    const result = JSON.parse(await fs.readFile(path.join(localStudioRoot, "local-result.json"), "utf8"));
    if (result.analysisId !== analysisId || result.url !== "http://127.0.0.1:3130/" || typeof result.title !== "string" || typeof result.verifiedAt !== "string" || !Array.isArray(result.checks) || !result.checks.every((s: unknown) => typeof s === "string")) return null;
    return { title: result.title.slice(0, 200), url: result.url, checks: result.checks.slice(0, 8), verifiedAt: result.verifiedAt };
  } catch { return null; }
}

export async function writeLocalJson(name: "local-plan.json" | "local-plan-usage.json", value: unknown) {
  await fs.mkdir(localStudioRoot, { recursive: true, mode: 0o700 });
  const temporary = path.join(localStudioRoot, `${name}.${crypto.randomUUID()}.tmp`);
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await fs.rename(temporary, path.join(localStudioRoot, name));
}

export async function localFramePath(analysis: Analysis, index: number, studioRoot = localStudioRoot): Promise<string | null> {
  const local = analysis.metadata?.local_evidence as { framePaths?: unknown[]; timestampsSec?: unknown[]; sourceUrl?: unknown } | undefined;
  const observations = analysis.frame_descriptions ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= observations.length || index >= 96 || !Array.isArray(local?.framePaths)) return null;
  if (local.sourceUrl !== undefined && local.sourceUrl !== analysis.source_url) return null;
  let imageIndex = index;
  if (Array.isArray(local.timestampsSec) && local.timestampsSec.length) {
    // A failed vision batch removes observations, not extracted JPEGs. Associate
    // by measured time so a surviving observation never opens an earlier image.
    const observation = observations[index] as { timestampSec?: unknown } | null;
    const timestamp = observation?.timestampSec;
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || local.timestampsSec.length !== local.framePaths.length) return null;
    const matches = local.timestampsSec.flatMap((time, candidate) => typeof time === "number" && Number.isFinite(time) && Math.abs(time - timestamp) <= 0.001 ? [candidate] : []);
    if (matches.length !== 1) return null;
    imageIndex = matches[0];
  } else if (local.framePaths.length !== observations.length) {
    // Legacy captures without timestamps are safe to align only when complete.
    return null;
  }
  const selected = local.framePaths[imageIndex];
  if (typeof selected !== "string") return null;
  try {
    const root = await fs.realpath(studioRoot);
    const filename = await fs.realpath(selected);
    if (!filename.startsWith(root + path.sep) || !/\.jpe?g$/i.test(filename)) return null;
    return filename;
  } catch { return null; }
}
