import { NextRequest, NextResponse } from "next/server";
import { readLocalHealth } from "@/lib/local-health";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const health = await readLocalHealth(request.headers);
  if (!health) return new NextResponse(null, { status: 404 });
  return NextResponse.json(health, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
