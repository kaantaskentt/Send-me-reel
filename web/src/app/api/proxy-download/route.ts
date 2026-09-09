import { NextRequest, NextResponse } from "next/server";
import { downloadPublicMedia, validProxySecret } from "@/lib/media-proxy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // A separate credential can be rotated without invalidating user sessions.
  const expected = process.env.MEDIA_PROXY_SECRET || process.env.JWT_SECRET;
  if (!validProxySecret(request.headers.get("x-proxy-secret"), expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "Missing request body" }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16_384) {
        await reader.cancel();
        return NextResponse.json({ error: "Request too large" }, { status: 413 });
      }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body.url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }
    const buffer = await downloadPublicMedia(body.url);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": "video/mp4", "Content-Length": String(buffer.byteLength), "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Media download rejected or unavailable" }, { status: 502 });
  }
}
