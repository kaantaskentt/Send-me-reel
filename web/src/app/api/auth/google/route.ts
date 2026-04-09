import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "@/lib/supabase-auth";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAuth();
  const baseUrl = request.nextUrl.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${baseUrl}/api/auth/email/callback`,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=google_failed", baseUrl));
  }

  return NextResponse.redirect(data.url);
}
