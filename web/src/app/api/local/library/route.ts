import { NextRequest, NextResponse } from "next/server";
import { isLocalStudioRequest, localStudioRoot } from "@/lib/local-studio";
import { readBoundedJson } from "@/lib/bounded-json";
import { activateLocalSource, listLocalLibrary, LocalLibraryError, requestedLibraryId } from "@/lib/local-library";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers)) return new NextResponse(null, { status: 404 });
  return NextResponse.json(await listLocalLibrary(localStudioRoot), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  try {
    let body: unknown;
    try { body = await readBoundedJson(request, 1_000); }
    catch { return NextResponse.json({ error: "Choose a saved source." }, { status: 400 }); }
    return NextResponse.json(await activateLocalSource(localStudioRoot, requestedLibraryId(body)), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof LocalLibraryError ? error.message : "Could not switch sources. The existing capture was preserved." }, { status: error instanceof LocalLibraryError ? error.status : 500 });
  }
}
