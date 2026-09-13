import { NextRequest, NextResponse } from "next/server";
import { isLocalStudioRequest, localStudioRoot } from "@/lib/local-studio";
import { readBoundedJson } from "@/lib/bounded-json";
import { dismissShareInboxItem, getShareInboxStatus, ShareInboxError, syncShareInbox } from "@/lib/local-share-inbox";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers)) return new NextResponse(null, { status: 404 });
  return NextResponse.json(await getShareInboxStatus({ root: localStudioRoot }), { headers });
}
export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  const options = { root: localStudioRoot };
  try {
    const body = await readBoundedJson(request, 1000) as Record<string, unknown>;
    if (!body || Array.isArray(body)) throw new ShareInboxError("Choose an inbox action.", 400);
    if (body.action === "sync" && Object.keys(body).length === 1) return NextResponse.json(await syncShareInbox(options), { headers });
    if (body.action === "dismiss" && typeof body.id === "string" && Object.keys(body).length === 2) return NextResponse.json(await dismissShareInboxItem(options, body.id), { headers });
    throw new ShareInboxError("Choose an inbox action.", 400);
  } catch (error) {
    return NextResponse.json({ ...await getShareInboxStatus(options), error: error instanceof ShareInboxError ? error.message : "The phone inbox could not complete this request. Original files are unchanged." }, { status: error instanceof ShareInboxError ? error.status : 400, headers });
  }
}
