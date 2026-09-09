import { NextRequest, NextResponse } from "next/server";
import { promises as fs, openSync, closeSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { isLocalStudioRequest, localProjectRoot, localStudioRoot, readLocalAnalysis } from "@/lib/local-studio";
import { captureIsActive, selectCaptureReader } from "@/lib/capture-routing";
import { readBoundedJson } from "@/lib/bounded-json";
import { getCaptureFailure } from "@/lib/capture-feedback";
import { GEMINI_VIDEO_POLICY_VERSION } from "../../../../../../src/services/geminiVideo";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers)) return new NextResponse(null, { status: 404 });
  const analysis = await readLocalAnalysis(true);
  const capture = analysis?.metadata?.local_capture as { stage?: string; nativeProgress?: Record<string, number> } | undefined;
  const progress = capture?.nativeProgress;
  const safeProgress = progress && Number.isInteger(progress.completedSegments) && Number.isInteger(progress.totalSegments) && progress.completedSegments >= 0 && progress.totalSegments > 0 ? Object.fromEntries(Object.entries(progress).filter(([key, value]) => ["completedSegments", "totalSegments", "startSec", "endSec", "pageStart", "pageEnd"].includes(key) && Number.isFinite(value) && value >= 0)) : undefined;
  return NextResponse.json({ id: analysis?.id, status: analysis?.status ?? "empty", sourceUrl: analysis?.source_url, stage: capture?.stage, progress: safeProgress, mediaKind: (analysis?.metadata?.source_evidence as { media_kind?: string })?.media_kind, frameCount: analysis?.frame_descriptions?.length ?? 0, error: getCaptureFailure(analysis) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  let selection;
  let question = "";
  try {
    const body = await readBoundedJson(request, 6_000) as { url: unknown; provider?: unknown; question?: unknown };
    if (Object.keys(body).some(key => !["url", "provider", "question"].includes(key))) throw new Error("Unexpected capture options.");
    if (body.question !== undefined && (typeof body.question !== "string" || body.question.length > 2000)) throw new Error("Keep your question under 2,000 characters.");
    question = typeof body.question === "string" ? body.question.trim() : "";
    selection = selectCaptureReader(body.url, body.provider ?? "auto", !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY));
  } catch (error) { return NextResponse.json({ error: error instanceof Error && error.message.length < 200 ? error.message : "Paste a public HTTPS link." }, { status: 400 }); }
  const sourceUrl = selection.url;
  if (selection.provider === "detailed" && !process.env.OPENAI_API_KEY) return NextResponse.json({ error: "The local server needs OPENAI_API_KEY for detailed video capture." }, { status: 503 });
  let existing = await readLocalAnalysis(true);
  if (existing && captureIsActive(existing)) return NextResponse.json({ error: "Content is already being captured. Wait for it to finish.", status: existing.status, id: existing.id, sourceUrl: existing.source_url, stage: (existing.metadata?.local_capture as { stage?: string })?.stage }, { status: 409 });
  await fs.mkdir(localStudioRoot, { recursive: true, mode: 0o700 });
  const lockfile = path.join(localStudioRoot, "capture-launch.lock");
  let lock;
  try { lock = await fs.open(lockfile, "wx", 0o600); } catch { return NextResponse.json({ error: "A capture is starting. Try again shortly." }, { status: 409 }); }
  let descriptor: number | undefined;
  let checkpointReplaced = false;
  const pending = { id: crypto.randomUUID(), source_url: sourceUrl, status: "scraping", frame_descriptions: [], created_at: new Date().toISOString(), metadata: { local_capture: { stage: "Starting source retrieval" } } };
  try {
    existing = await readLocalAnalysis(true);
    if (captureIsActive(existing)) return NextResponse.json({ error: "Content is already being captured. Wait for it to finish." }, { status: 409 });
    const checkpoint = path.join(localStudioRoot, "local-analysis.json");
    const temporary = `${checkpoint}.launch.tmp`;
    // Keep the previous source and its evidence available locally. A native retry
    // resumes completed clips instead of discarding its checkpoint.
    if (existing && /^[a-zA-Z0-9-]{1,80}$/.test(existing.id)) {
      const library = path.join(localStudioRoot, "library");
      await fs.mkdir(library, { recursive: true, mode: 0o700 });
      await fs.writeFile(path.join(library, `${existing.id}.json`), JSON.stringify(existing), { mode: 0o600 });
    }
    const priorNative = (existing?.metadata?.source_evidence as { native_video?: { policyVersion?: string } } | undefined)?.native_video;
    const resume = selection.provider === "gemini" && existing?.status === "failed" && existing.source_url === sourceUrl && (!question || question === existing.metadata?.userNote) && priorNative?.policyVersion === GEMINI_VIDEO_POLICY_VERSION;
    if (!resume) { await fs.writeFile(temporary, JSON.stringify(pending), { mode: 0o600 }); await fs.rename(temporary, checkpoint); checkpointReplaced = true; }
    // Fixed executable and literal argv; the URL is never shell text. The CLI owns
    // durable stage checkpoints, timeouts, and cleanup independently of Next dev.
    descriptor = openSync(path.join(localStudioRoot, "local-capture.log"), "a", 0o600);
    const child = spawn(process.execPath, ["--import", "tsx", selection.script, sourceUrl, "--output", ".contextdrop/local-analysis.json", "--timeout-seconds", String(selection.timeoutSeconds), ...(question ? ["--note", question] : []), ...(resume ? ["--resume"] : [])], { cwd: localProjectRoot, env: process.env, detached: true, stdio: ["ignore", descriptor, descriptor] });
    await new Promise<void>((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
    child.unref();
    // Prevent duplicate starts while the CLI initializes its first checkpoint.
    await new Promise(resolve => setTimeout(resolve, 2_000));
    return NextResponse.json({ status: "starting", sourceUrl }, { status: 202 });
  } catch {
    const failed = { ...pending, status: "failed", error_message: "The capture process could not start.", metadata: { local_capture: { stage: "failed", errorCode: "CAPTURE_START_FAILED" } } };
    const temporary = path.join(localStudioRoot, `local-analysis.${pending.id}.tmp`);
    if (checkpointReplaced) await fs.writeFile(temporary, JSON.stringify(failed), { mode: 0o600 }).then(() => fs.rename(temporary, path.join(localStudioRoot, "local-analysis.json"))).catch(() => {});
    return NextResponse.json({ error: "The video reader could not start on this Mac. Check the local setup, then try again." }, { status: 502 });
  }
  finally { if (descriptor !== undefined) closeSync(descriptor); await lock.close(); await fs.unlink(lockfile).catch(() => {}); }
}
