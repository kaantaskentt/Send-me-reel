import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "@/lib/supabase-auth";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAuth();
  const baseUrl = request.nextUrl.origin;

  // Optional: claim_token forwarded from /claim page so we can merge a
  // Telegram-only account into the new Google identity (Demi fix, Apr 2026).
  const claimToken = request.nextUrl.searchParams.get("claim_token");

  // Build the callback URL with claim_token preserved as a query param.
  // Supabase preserves the full redirectTo URL through the OAuth round trip,
  // so the client callback page receives both ?claim_token=X and #access_token=Y.
  const callbackUrl = new URL(`${baseUrl}/auth/google/callback`);
  if (claimToken) {
    callbackUrl.searchParams.set("claim_token", claimToken);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Client page (not API route) because implicit flow returns tokens in
      // a #hash fragment which only JavaScript can read.
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=google_failed", baseUrl));
  }

  return NextResponse.redirect(data.url);
}
