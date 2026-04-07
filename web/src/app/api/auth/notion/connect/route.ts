import { NextRequest, NextResponse } from "next/server";
import { verifyToken, setSessionCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const analysisId = request.nextUrl.searchParams.get("analysisId");
  const baseUrl = request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/?error=missing_token", baseUrl));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/?error=invalid_token", baseUrl));
  }

  // Set session cookie so the OAuth callback can identify the user
  await setSessionCookie(token);

  // Redirect to bridge page (prepares user for Notion's page selection step)
  const bridgeUrl = new URL("/connect-notion", baseUrl);
  if (analysisId) {
    bridgeUrl.searchParams.set("analysisId", analysisId);
  }

  return NextResponse.redirect(bridgeUrl.toString());
}
