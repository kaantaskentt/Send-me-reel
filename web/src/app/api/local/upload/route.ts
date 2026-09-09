import { NextRequest, NextResponse } from "next/server";
import { promises as fs, closeSync, openSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { isLocalStudioRequest, localProjectRoot, localStudioRoot, readLocalAnalysis } from "@/lib/local-studio";
import { captureIsActive } from "@/lib/capture-routing";
import { atomicUploadJson, receiveUpload, UploadError, uploadOptions, uploadSourceUrl } from "../../../../../../src/services/uploadStore";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  let filename: string, question: string;
  try {
    filename = decodeURIComponent(request.headers.get("x-contextdrop-filename") || "");
    question = decodeURIComponent(request.headers.get("x-contextdrop-question") || "");
    const { kind } = uploadOptions(filename, question);
    if (kind !== "text" && !(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) return NextResponse.json({ error: "Connect the project's Gemini key to read uploaded media. Text files work without it." }, { status: 503 });
  } catch (error) { return NextResponse.json({ error: error instanceof UploadError ? error.message : "Choose a supported file." }, { status: 400 }); }
  await fs.mkdir(localStudioRoot, { recursive: true, mode: 0o700 });
  const lockfile = path.join(localStudioRoot, "capture-launch.lock");
  let lock;
  try { lock = await fs.open(lockfile, "wx", 0o600); } catch { return NextResponse.json({ error: "Content is already being imported. Wait for it to finish." }, { status: 409 }); }
  let descriptor: number | undefined;
  let uploadId: string | undefined;
  let launched = false;
  let checkpointReplaced = false;
  try {
    // Re-read after acquiring the shared lock: uploads, links and library switches cannot race.
    const existing = await readLocalAnalysis(true);
    if (captureIsActive(existing)) return NextResponse.json({ error: "Content is already being read. Wait for it to finish." }, { status: 409 });
    const rawLength = request.headers.get("content-length");
    const manifest = await receiveUpload(path.join(localStudioRoot, "uploads"), request.body, filename, question, AbortSignal.any([request.signal, AbortSignal.timeout(180_000)]), rawLength === null ? undefined : Number(rawLength));
    uploadId = manifest.id;
    if (existing && /^[a-zA-Z0-9-]{1,80}$/.test(existing.id)) {
      await fs.mkdir(path.join(localStudioRoot, "library"), { recursive: true, mode: 0o700 });
      await atomicUploadJson(path.join(localStudioRoot, "library", `${existing.id}.json`), existing);
    }
    await atomicUploadJson(path.join(localStudioRoot, "local-analysis.json"), { id: manifest.id, source_url: uploadSourceUrl(manifest.id), status: "scraping", title: manifest.filename, frame_descriptions: [], created_at: new Date().toISOString(), metadata: { upload: manifest, source_evidence: { media_kind: manifest.kind === "text" ? "article" : manifest.kind }, local_capture: { startedAt: new Date().toISOString(), stage: "upload_validation", timeoutSeconds: 1800 } } });
    checkpointReplaced = true;
    descriptor = openSync(path.join(localStudioRoot, "local-capture.log"), "a", 0o600);
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/capture-upload.ts", manifest.id], { cwd: localProjectRoot, env: process.env, detached: true, stdio: ["ignore", descriptor, descriptor] });
    await new Promise<void>((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
    child.unref(); launched = true;
    return NextResponse.json({ status: "starting", id: manifest.id, sourceUrl: uploadSourceUrl(manifest.id) }, { status: 202 });
  } catch (error) {
    if (uploadId && !launched && checkpointReplaced) {
      await atomicUploadJson(path.join(localStudioRoot, "local-analysis.json"), { id: uploadId, source_url: uploadSourceUrl(uploadId), title: filename, status: "failed", frame_descriptions: [], created_at: new Date().toISOString(), metadata: { local_capture: { stage: "failed", errorCode: "CAPTURE_START_FAILED" } } }).catch(() => {});
    }
    if (uploadId && !checkpointReplaced) await fs.rm(path.join(localStudioRoot, "uploads", uploadId), { recursive: true, force: true }).catch(() => {});
    return NextResponse.json({ error: error instanceof UploadError ? error.message : "The file could not be imported. Please try again." }, { status: error instanceof UploadError ? error.status : 502 });
  } finally { if (descriptor !== undefined) closeSync(descriptor); await lock.close(); await fs.unlink(lockfile).catch(() => {}); }
}
