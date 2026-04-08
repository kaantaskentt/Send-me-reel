import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "@/lib/supabase-auth";
import { getSupabase } from "@/lib/supabase";
import { setSessionCookie } from "@/lib/auth";
import { SignJWT } from "jose";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const baseUrl = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", baseUrl));
  }

  // Exchange the code for a Supabase Auth session
  const supabase = getSupabaseAuth();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    console.error("Email auth callback error:", error);
    return NextResponse.redirect(new URL("/login?error=auth_failed", baseUrl));
  }

  const email = data.user.email;

  // Look up or create user in our users table
  const db = getSupabase();

  // First try to find by email
  let { data: user } = await db
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (!user) {
    // Create new user from email signup
    const displayName = email.split("@")[0];
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
      return NextResponse.redirect(new URL("/login?error=create_failed", baseUrl));
    }

    user = newUser;

    // Create initial credits (50 free)
    await db.from("credits").insert({ user_id: user.id });
  }

  // Generate our standard JWT
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/login?error=config", baseUrl));
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

  // Redirect to dashboard (or onboarding if not onboarded)
  if (!user.onboarded) {
    return NextResponse.redirect(new URL("/context", baseUrl));
  }

  return NextResponse.redirect(new URL("/dashboard", baseUrl));
}
