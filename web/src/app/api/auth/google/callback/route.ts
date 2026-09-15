import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "../../../../../lib/supabase-auth";
import { getSupabase } from "../../../../../lib/supabase";
import { getSession, setSessionCookie, signToken, verifyToken } from "../../../../../lib/auth";
import { mergeAccounts } from "../../../../../lib/merge-accounts";
import { readBoundedJson } from "../../../../../lib/bounded-json";
import { isSameOriginAuthRequest, parseGoogleCallback, providerRequestError, type GoogleAuthError } from "../../../../../lib/google-auth";
import { GOOGLE_FLOW_COOKIE, googleFlowCookieOptions, googleAuthConfigured, googleAuthStorage, readGoogleFlow } from "../../../../../lib/google-auth-state";

export async function POST(request: NextRequest) {
  const failure = (error: GoogleAuthError, status: number) => NextResponse.json({ success: false, error }, { status, headers: { "Cache-Control": "no-store" } });
  if (!isSameOriginAuthRequest(request)) return failure("google_invalid", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return failure("google_invalid", 415);
  let input;
  try { input = parseGoogleCallback(await readBoundedJson(request, 4096)); }
  catch { return failure("google_invalid", 400); }
  if (!input) return failure("google_invalid", 400);
  if (!googleAuthConfigured()) return failure("google_unavailable", 503);

  const flow = await readGoogleFlow(request.cookies.get(GOOGLE_FLOW_COOKIE)?.value, input.state, process.env.JWT_SECRET!);
  if (!flow) return failure("google_expired", 401);

  try {
    // The one-use provider code is useless without this browser's encrypted verifier.
    const supabase = getSupabaseAuth(googleAuthStorage(flow.verifier));
    const { data, error } = await supabase.auth.exchangeCodeForSession(input.code);
    if (error || !data.session) {
      const code = error ? providerRequestError(error, "google_expired") : "google_expired";
      return failure(code, code === "google_unavailable" ? 503 : 401);
    }
    const { data: authData, error: authError } = await supabase.auth.getUser(data.session.access_token);
    const identity = authData.user;
    if (authError) {
      const code = providerRequestError(authError, "google_failed");
      return failure(code, code === "google_unavailable" ? 503 : 401);
    }
    if (!identity?.email || !identity.email_confirmed_at || !identity.identities?.some(item => item.provider === "google")) return failure("google_failed", 401);

    const claim = flow.claimToken ? await verifyToken(flow.claimToken) : null;
    if (flow.claimToken && (!claim || typeof claim.sub !== "string" || !claim.tid)) return failure("google_claim_failed", 401);

    const email = identity.email;
    const name = identity.user_metadata?.full_name;
    const googleName = typeof name === "string" ? name.trim().slice(0, 200) : "";
    const db = getSupabase();
    const { data: foundUser, error: lookupError } = await db.from("users").select("*").eq("email", email).maybeSingle();
    if (lookupError) return failure("google_account_failed", 503);
    let user = foundUser;

    const existingSession = await getSession();
    if (existingSession && existingSession.sub !== user?.id) return failure("account_conflict", 409);

    if (!user) {
      const { data: newUser, error: createError } = await db.from("users").insert({ email, first_name: googleName || email.split("@")[0], onboarded: false }).select().single();
      if (createError?.code === "23505") {
        // Another tab may have created the same verified identity while this one returned.
        const retry = await db.from("users").select("*").eq("email", email).maybeSingle();
        if (retry.error || !retry.data) return failure("google_account_failed", 503);
        user = retry.data;
      } else {
        if (createError || !newUser) return failure("google_account_failed", 503);
        user = newUser;
        const { error: creditsError } = await db.from("credits").insert({ user_id: user.id });
        if (creditsError) console.error("[google-auth] credits_initialization_failed");
      }
    } else if (googleName && user.first_name !== googleName) {
      const { data: updated, error: updateError } = await db.from("users").update({ first_name: googleName }).eq("id", user.id).select().single();
      if (!updateError && updated) user = updated;
    }

    let claimedTelegram = false;
    if (claim) {
      if (claim.sub === user.id && claim.tid === user.telegram_id) {
        claimedTelegram = true;
      } else {
        const { data: claimUser, error: claimError } = await db.from("users").select("id, telegram_id, email").eq("id", claim.sub).maybeSingle();
        if (claimError || !claimUser || !claimUser.telegram_id || claimUser.telegram_id !== claim.tid || claimUser.email || (user.telegram_id && user.telegram_id !== claimUser.telegram_id)) return failure("google_claim_failed", 409);
        const result = await mergeAccounts(user.id, claimUser.id);
        if (!result.merged) return failure("google_claim_failed", 409);
        const { data: refreshed, error: refreshError } = await db.from("users").select("*").eq("id", user.id).single();
        if (refreshError || !refreshed || refreshed.telegram_id !== claim.tid) return failure("google_claim_failed", 503);
        user = refreshed;
        claimedTelegram = true;
      }
    }

    await setSessionCookie(await signToken({ sub: user.id, username: user.telegram_username || user.email || "", tid: user.telegram_id || 0 }));
    const response = NextResponse.json({ success: true, redirect: claimedTelegram || user.onboarded ? "/dashboard" : "/context" }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(GOOGLE_FLOW_COOKIE, "", { ...googleFlowCookieOptions, maxAge: 0 });
    return response;
  } catch {
    console.error("[google-auth] callback_failed");
    return failure("google_account_failed", 503);
  }
}
