import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { createNotionOAuthState, NOTION_STATE_COOKIE } from "@/lib/notion-oauth-state";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId || !process.env.JWT_SECRET) return NextResponse.json({ error: "Notion is not configured" }, { status: 503 });
  const analysisId = request.nextUrl.searchParams.get("analysisId");
  if (analysisId) {
    const { data } = await getSupabase().from("analyses").select("id").eq("id", analysisId).eq("user_id", session.sub).single();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const nonce = randomBytes(32).toString("base64url");
  const state = await createNotionOAuthState(session.sub, nonce, analysisId, process.env.JWT_SECRET);
  (await cookies()).set(NOTION_STATE_COOKIE, nonce, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("redirect_uri", `${request.nextUrl.origin}/api/auth/notion/callback`);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
