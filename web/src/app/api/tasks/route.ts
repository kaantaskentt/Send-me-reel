import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// GET — all tasks for the user, joined with analysis info
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();

  const { data } = await supabase
    .from("analysis_todos")
    .select("id, title, completed, created_at, completed_at, analysis_id, analyses(source_url, platform, verdict)")
    .eq("user_id", session.sub)
    .order("completed", { ascending: true })
    .order("created_at", { ascending: false });

  return NextResponse.json({ tasks: data || [] });
}
