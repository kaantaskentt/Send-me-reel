import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getSession, setSessionCookie, signToken } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { mergeAccounts } from "@/lib/merge-accounts";

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
  const { data: tokenUser } = await db
    .from("users")
    .select("id, telegram_id, telegram_username")
    .eq("id", payload.sub)
    .single();

  if (!tokenUser) {
    return NextResponse.redirect(new URL("/login?error=account_not_found", baseUrl));
  }

  // Check for existing session (user might be logged in with a different identity)
  const existingSession = await getSession();

  if (existingSession && existingSession.sub !== payload.sub) {
    // Different user is logged in — check if we should merge
    const { data: sessionUser } = await db
      .from("users")
      .select("id, telegram_id")
      .eq("id", existingSession.sub)
      .single();

    if (sessionUser && !sessionUser.telegram_id && tokenUser.telegram_id) {
      // Session user has no telegram_id — merge the Telegram account into their account
      await mergeAccounts(sessionUser.id, tokenUser.id);

      // Regenerate JWT for the kept user with the newly linked telegram_id
      const newToken = await signToken({
        sub: sessionUser.id,
        username: existingSession.username,
        tid: tokenUser.telegram_id,
      });
      await setSessionCookie(newToken);

      return NextResponse.redirect(new URL("/dashboard", baseUrl));
    }

    // Session user already has a telegram_id (different account) — just log in as the token user
  }

  // Normal flow: set session cookie for the token user
  await setSessionCookie(token);
  return NextResponse.redirect(new URL("/dashboard", baseUrl));
}
