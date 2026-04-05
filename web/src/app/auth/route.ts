import { NextRequest, NextResponse } from "next/server";
import { verifyToken, setSessionCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Set session cookie
  await setSessionCookie(token);

  // Redirect to dashboard
  const username = payload.username || payload.tid;
  return NextResponse.redirect(new URL(`/${username}`, request.url));
}
