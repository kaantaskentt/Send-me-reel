import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  const [userRes, contextRes, creditsRes] = await Promise.all([
    supabase.from("users").select("*").eq("id", session.sub).single(),
    supabase
      .from("user_contexts")
      .select("role, goal, content_preferences")
      .eq("user_id", session.sub)
      .single(),
    supabase
      .from("credits")
      .select("balance, lifetime_used")
      .eq("user_id", session.sub)
      .single(),
  ]);

  return NextResponse.json({
    user: userRes.data,
    context: contextRes.data,
    credits: creditsRes.data || { balance: 0, lifetime_used: 0 },
  });
}
