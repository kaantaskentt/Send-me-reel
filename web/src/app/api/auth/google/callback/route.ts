import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "@/lib/supabase-auth";
import { getSupabase } from "@/lib/supabase";
import { setSessionCookie } from "@/lib/auth";
import { SignJWT } from "jose";

export async function POST(request: NextRequest) {
  const { access_token } = await request.json();

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
    await db.from("credits").insert({ user_id: user.id });
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

  // Redirect to dashboard (or context if not onboarded)
  const redirect = user.onboarded ? "/dashboard" : "/context";

  return NextResponse.json({ success: true, redirect });
}
