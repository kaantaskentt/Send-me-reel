import { NextRequest, NextResponse } from "next/server";
import { promises as fs, openSync, closeSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { isLocalStudioRequest, localProjectRoot, localStudioRoot, readLocalAnalysis, validateLocalSourceUrl } from "@/lib/local-studio";
import { readBoundedJson } from "@/lib/bounded-json";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers)) return new NextResponse(null, { status: 404 });
  const analysis = await readLocalAnalysis(true);
  return NextResponse.json({ id: analysis?.id, status: analysis?.status ?? "empty", sourceUrl: analysis?.source_url, stage: (analysis?.metadata?.local_capture as { stage?: string })?.stage, frameCount: analysis?.frame_descriptions?.length ?? 0 }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  let sourceUrl;
  try {
    const body = await readBoundedJson(request, 4_000) as { url: unknown };
    if (Object.keys(body).some(key => key !== "url")) throw new Error();
    sourceUrl = validateLocalSourceUrl(body.url);
  } catch { return NextResponse.json({ error: "Paste a public HTTPS video link from YouTube, Instagram, TikTok, or X." }, { status: 400 }); }
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "The local server needs OPENAI_API_KEY." }, { status: 503 });
  const existing = await readLocalAnalysis(true);
  if (existing && !["done", "failed"].includes(existing.status) && Date.now() - Date.parse(existing.created_at) < 15 * 60_000) return NextResponse.json({ error: "A video is already being captured. Wait for it to finish." }, { status: 409 });
  await fs.mkdir(localStudioRoot, { recursive: true, mode: 0o700 });
  const lockfile = path.join(localStudioRoot, "capture-launch.lock");
  let lock;
  try { lock = await fs.open(lockfile, "wx", 0o600); } catch { return NextResponse.json({ error: "A capture is starting. Try again shortly." }, { status: 409 }); }
  let descriptor: number | undefined;
  try {
    const pending = { id: crypto.randomUUID(), source_url: sourceUrl, status: "scraping", frame_descriptions: [], created_at: new Date().toISOString(), metadata: { local_capture: { stage: "Starting source retrieval" } } };
    const checkpoint = path.join(localStudioRoot, "local-analysis.json");
    const temporary = `${checkpoint}.launch.tmp`;
    await fs.writeFile(temporary, JSON.stringify(pending), { mode: 0o600 });
    await fs.rename(temporary, checkpoint);
    // Fixed executable and literal argv; the URL is never shell text. The CLI owns
    // durable stage checkpoints, timeouts, and cleanup independently of Next dev.
    descriptor = openSync(path.join(localStudioRoot, "local-capture.log"), "a", 0o600);
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/analyze-one.ts", sourceUrl, "--output", ".contextdrop/local-analysis.json", "--timeout-seconds", "720"], { cwd: localProjectRoot, env: process.env, detached: true, stdio: ["ignore", descriptor, descriptor] });
    await new Promise<void>((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
    child.unref();
    // Prevent duplicate starts while the CLI initializes its first checkpoint.
    await new Promise(resolve => setTimeout(resolve, 2_000));
    return NextResponse.json({ status: "starting", sourceUrl }, { status: 202 });
  } catch { return NextResponse.json({ error: "The capture process could not start. Inspect the local setup." }, { status: 502 }); }
  finally { if (descriptor !== undefined) closeSync(descriptor); await lock.close(); await fs.unlink(lockfile).catch(() => {}); }
}
