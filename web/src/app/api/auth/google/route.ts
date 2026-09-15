import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "../../../../lib/supabase-auth";
import { verifyToken } from "../../../../lib/auth";
import { isSameOriginAuthRequest, type GoogleAuthError } from "../../../../lib/google-auth";
import { GOOGLE_FLOW_COOKIE, googleFlowCookieOptions, googleAuthConfigured, googleAuthStorage, newGoogleState, signGoogleFlow } from "../../../../lib/google-auth-state";

export async function GET(request: NextRequest) {
  const failure = (error: GoogleAuthError) => {
    const response = NextResponse.redirect(new URL(`/login?error=${error}`, request.nextUrl.origin));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  if (!isSameOriginAuthRequest(request, false)) return failure("google_invalid");
  if (!googleAuthConfigured()) return failure("google_unavailable");

  try {
    const claimToken = request.nextUrl.searchParams.get("claim_token");
    if (request.nextUrl.searchParams.getAll("claim_token").length > 1 || (claimToken !== null &&
      (!claimToken || claimToken.length > 2048 || !(await verifyToken(claimToken))))) return failure("google_claim_failed");

    const storage = googleAuthStorage();
    const supabase = getSupabaseAuth(storage);
    const state = newGoogleState();
    const callbackUrl = new URL("/auth/google/callback", request.nextUrl.origin);
    callbackUrl.searchParams.set("state", state);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google", options: { redirectTo: callbackUrl.toString(), skipBrowserRedirect: true },
    });
    const verifier = storage.verifier();
    if (error || !data.url || !verifier) return failure("google_unavailable");

    const response = NextResponse.redirect(data.url);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(GOOGLE_FLOW_COOKIE, await signGoogleFlow({ state, verifier, ...(claimToken ? { claimToken } : {}) }, process.env.JWT_SECRET!), googleFlowCookieOptions);
    return response;
  } catch {
    console.error("[google-auth] start_failed");
    return failure("google_unavailable");
  }
}
