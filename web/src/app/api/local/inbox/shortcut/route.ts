import { NextRequest, NextResponse } from "next/server";
import { constants, promises as fs } from "node:fs";
import path from "node:path";
import { isLocalStudioRequest, localStudioRoot } from "@/lib/local-studio";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isLocalStudioRequest(request.headers)) return new NextResponse(null, { status: 404 });
  let handle;
  try {
    handle = await fs.open(path.join(localStudioRoot, "Send-to-ContextDrop.shortcut"), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const info = await handle.stat();
    if (!info.isFile() || info.size < 1 || info.size > 1_000_000) return new NextResponse(null, { status: 404 });
    const bytes = Buffer.alloc(1_000_001);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    const after = await handle.stat();
    if (bytesRead !== info.size || after.size !== info.size || after.mtimeMs !== info.mtimeMs) return new NextResponse(null, { status: 409 });
    return new NextResponse(new Uint8Array(bytes.subarray(0, bytesRead)), { headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="Send to ContextDrop.shortcut"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch { return NextResponse.json({ error: "The personal iPhone shortcut has not been created on this Mac yet." }, { status: 404 }); }
  finally { await handle?.close(); }
}
