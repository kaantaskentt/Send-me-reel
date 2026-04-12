import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { signToken, setSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Check if email already exists
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const { data: user, error } = await supabase
    .from("users")
    .insert({
      telegram_id: 0, // placeholder — will be linked if they use Telegram later
      email: email.toLowerCase().trim(),
      first_name: name?.trim() || email.split("@")[0],
      password_hash: passwordHash,
      onboarded: false,
    })
    .select("id, first_name, email")
    .single();

  if (error || !user) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }

  // Grant 50 free credits
  await supabase.from("credits").insert({
    user_id: user.id,
    balance: 50,
    lifetime_used: 0,
  });

  // Create session
  const token = await signToken({
    sub: user.id,
    username: user.email || user.first_name || "",
    tid: 0,
  });
  await setSessionCookie(token);

  return NextResponse.json({ success: true, onboarded: false });
}
