import { NextRequest, NextResponse } from "next/server";
import { isLocalStudioRequest, localStudioRoot } from "@/lib/local-studio";
import { readBoundedJson } from "@/lib/bounded-json";
import { connectPhoneInbox, disconnectPhoneInbox, getPhoneInboxStatus, PhoneInboxError, syncPhoneInbox } from "@/lib/local-phone-inbox";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers)) return new NextResponse(null, { status: 404 });
  return NextResponse.json(await getPhoneInboxStatus({ root: localStudioRoot }), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers, true)) return new NextResponse(null, { status: 404 });
  const options = { root: localStudioRoot };
  try {
    const body = await readBoundedJson(request, 9000) as Record<string, unknown>;
    if (!body || Array.isArray(body) || Object.keys(body).length !== 1) throw new PhoneInboxError("Choose a phone inbox action.", 400);
    if (typeof body.dashboardLink === "string") {
      await connectPhoneInbox(options, body.dashboardLink);
      // Pairing succeeds independently of a temporary import outage.
      try { await syncPhoneInbox(options); } catch { /* Status explains the retryable failure. */ }
    } else if (body.action === "sync") await syncPhoneInbox(options);
    else if (body.action === "disconnect") await disconnectPhoneInbox(options);
    else throw new PhoneInboxError("Choose a phone inbox action.", 400);
    return NextResponse.json(await getPhoneInboxStatus(options), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PhoneInboxError ? error.message : "Phone inbox could not complete this request. Your saved content is unchanged.", ...await getPhoneInboxStatus(options) }, { status: error instanceof PhoneInboxError ? error.status : 400, headers: { "Cache-Control": "no-store" } });
  }
}
