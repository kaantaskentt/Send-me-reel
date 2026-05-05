import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason, source } = await request.json();

  const supabase = getSupabase();

  const { count } = await supabase
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.sub);

  const { error } = await supabase.from("premium_requests").insert({
    user_id: session.sub,
    reason: reason?.slice(0, 1500) || null,
    source: source || null,
    analysis_count_at_request: count ?? 0,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_requested" }, { status: 409 });
    }
    console.error("Premium request error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
