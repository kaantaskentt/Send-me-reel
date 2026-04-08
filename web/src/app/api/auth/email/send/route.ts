import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "@/lib/supabase-auth";

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = getSupabaseAuth();
  const baseUrl = request.nextUrl.origin;

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: `${baseUrl}/api/auth/email/callback`,
    },
  });

  if (error) {
    console.error("Magic link send error:", error);
    return NextResponse.json(
      { error: "Failed to send magic link. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
