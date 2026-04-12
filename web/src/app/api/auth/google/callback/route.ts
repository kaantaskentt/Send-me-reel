import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "@/lib/supabase-auth";
import { getSupabase } from "@/lib/supabase";
import { setSessionCookie, verifyToken } from "@/lib/auth";
import { mergeAccounts } from "@/lib/merge-accounts";
import { SignJWT } from "jose";

export async function POST(request: NextRequest) {
  const { access_token, claim_token } = await request.json();

  if (!access_token) {
    return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 });
  }

  // Use the access token to get the user's info from Supabase Auth
  const supabase = getSupabaseAuth();
  const { data: authData, error: authError } = await supabase.auth.getUser(access_token);

  if (authError || !authData.user?.email) {
    console.error("Google auth callback error:", authError);
    return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
  }

  const email = authData.user.email;
  const displayName = authData.user.user_metadata?.full_name || email.split("@")[0];

  // Look up or create user in our users table (same logic as email callback)
  const db = getSupabase();

  let { data: user } = await db
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (!user) {
    // Create new user from Google signup
    const { data: newUser, error: createErr } = await db
      .from("users")
      .insert({
        email,
        first_name: displayName,
        onboarded: false,
      })
      .select()
      .single();

    if (createErr) {
      console.error("User creation error:", createErr);
      return NextResponse.json({ success: false, error: "Failed to create account" }, { status: 500 });
    }

    user = newUser;

    // Create initial credits (50 free)
    const { error: creditsErr } = await db.from("credits").insert({ user_id: user.id });
    if (creditsErr) {
      console.error("Credits creation error:", creditsErr);
    }
  }

  // ── Claim flow: merge a Telegram-only account into this Google account ──
  // (Demi fix — Apr 2026)
  if (claim_token && typeof claim_token === "string") {
    const claimPayload = await verifyToken(claim_token);
    if (claimPayload && claimPayload.sub !== user.id) {
      // Verify the claim token's user exists and is telegram-only
      const { data: claimUser } = await db
        .from("users")
        .select("id, telegram_id, email")
        .eq("id", claimPayload.sub)
        .single();

      if (claimUser && claimUser.telegram_id && !claimUser.email) {
        // Safe to merge: Google user is the keep target, telegram user is the orphan
        const result = await mergeAccounts(user.id, claimUser.id);
        if (result.merged) {
          // Re-fetch the unified user so we get the new telegram_id
          const { data: refreshed } = await db
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();
          if (refreshed) user = refreshed;
          console.log(`[google-callback] Claimed telegram account ${claimUser.id} into ${user.id}`);
        }
      }
    }
  }

  // Generate our standard JWT
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ success: false, error: "Config error" }, { status: 500 });
  }

  const token = await new SignJWT({
    sub: user.id,
    username: user.telegram_username || user.email || "",
    tid: user.telegram_id || 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(new TextEncoder().encode(secret));

  // Set session cookie
  await setSessionCookie(token);

  // Redirect to dashboard. After a successful claim, the user goes straight to
  // dashboard regardless of onboarded status (they already onboarded via the bot).
  const claimedTelegram = !!user.telegram_id && !!claim_token;
  const redirect = claimedTelegram || user.onboarded ? "/dashboard" : "/context";

  return NextResponse.json({ success: true, redirect });
}
