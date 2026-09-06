import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { isLocalStudioRequest, readLocalAnalysis, localFramePath } from "@/lib/local-studio";
import { frameSourceMatches } from "@/lib/local-library";

export const runtime = "nodejs";
export async function GET(request: NextRequest, { params }: { params: Promise<{ index: string }> }) {
  if (!isLocalStudioRequest(request.headers)) return new NextResponse(null, { status: 404 });
  const { index } = await params;
  if (!/^\d{1,2}$/.test(index)) return new NextResponse(null, { status: 404 });
  const analysis = await readLocalAnalysis();
  if (!analysis || !frameSourceMatches(request.nextUrl.searchParams, analysis.id)) return new NextResponse(null, { status: 404 });
  const filename = analysis ? await localFramePath(analysis, Number(index)) : null;
  if (!filename) return new NextResponse(null, { status: 404 });
  const bytes = await fs.readFile(filename);
  return new NextResponse(bytes, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
