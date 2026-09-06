import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getSession, setSessionCookie, signToken } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const baseUrl = request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", baseUrl));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/login?error=expired_token", baseUrl));
  }

  const db = getSupabase();

  // Verify the token's user still exists (may have been merged/deleted)
  let { data: tokenUser } = await db
    .from("users")
    .select("id, telegram_id, telegram_username, email")
    .eq("id", payload.sub)
    .single();

  // If user_id from JWT doesn't exist but we have a tid (telegram_id), look up
  // the post-merge unified user. Old verdict buttons keep working after merge.
  if (!tokenUser && payload.tid) {
    const { data: byTid } = await db
      .from("users")
      .select("id, telegram_id, telegram_username, email")
      .eq("telegram_id", payload.tid)
      .single();
    tokenUser = byTid;
  }

  if (!tokenUser) {
    return NextResponse.redirect(new URL("/login?error=account_not_found", baseUrl));
  }

  // Check for existing session (user might be logged in with a different identity)
  const existingSession = await getSession();

  if (existingSession && existingSession.sub !== tokenUser.id) {
    // A cross-site GET can carry a SameSite=Lax session cookie. Never link an
    // arbitrary magic-link identity to that session or silently replace it.
    return NextResponse.redirect(new URL("/login?error=account_conflict", baseUrl));
  }

  // Telegram-only user (no email yet) and no existing session → force them to
  // claim their account by signing up with Google. Otherwise their data is lost
  // the moment they clear cookies (Demi feedback, Apr 2026).
  if (!tokenUser.email && !existingSession) {
    return NextResponse.redirect(new URL(`/claim?token=${encodeURIComponent(token)}`, baseUrl));
  }

  // Normal flow: set session cookie for the token user
  const sessionToken = tokenUser.id === payload.sub ? token : await signToken({
    sub: tokenUser.id,
    username: tokenUser.telegram_username || tokenUser.email || payload.username,
    tid: tokenUser.telegram_id || 0,
  });
  await setSessionCookie(sessionToken);
  return NextResponse.redirect(new URL("/dashboard", baseUrl));
}
