import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { signToken, setSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: user } = await supabase
    .from("users")
    .select("id, first_name, email, password_hash, onboarded, telegram_id")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!user) {
    return NextResponse.json({ error: "No account found with this email" }, { status: 401 });
  }

  if (!user.password_hash) {
    return NextResponse.json({ error: "This account uses Google sign-in. Please use 'Continue with Google' instead." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  // Create session
  const token = await signToken({
    sub: user.id,
    username: user.email || user.first_name || "",
    tid: user.telegram_id || 0,
  });
  await setSessionCookie(token);

  return NextResponse.json({ success: true, onboarded: user.onboarded });
}
