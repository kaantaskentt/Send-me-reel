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

  // Build Notion OAuth URL
  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/?error=notion_not_configured", baseUrl));
  }

  const redirectUri = `${baseUrl}/api/auth/notion/callback`;
  const state = analysisId || "";

  const notionAuthUrl = new URL("https://api.notion.com/v1/oauth/authorize");
  notionAuthUrl.searchParams.set("client_id", clientId);
  notionAuthUrl.searchParams.set("response_type", "code");
  notionAuthUrl.searchParams.set("owner", "user");
  notionAuthUrl.searchParams.set("redirect_uri", redirectUri);
  if (state) {
    notionAuthUrl.searchParams.set("state", state);
  }

  return NextResponse.redirect(notionAuthUrl.toString());
}
