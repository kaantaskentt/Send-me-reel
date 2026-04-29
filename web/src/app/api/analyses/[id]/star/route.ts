import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabase();

  const { data: row, error: fetchErr } = await supabase
    .from("analyses")
    .select("user_id, starred_at")
    .eq("id", id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (row.user_id !== session.sub) {
    return NextResponse.json({ error: "Not your analysis" }, { status: 403 });
  }

  const newStarredAt = row.starred_at ? null : new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("analyses")
    .update({ starred_at: newStarredAt })
    .eq("id", id)
    .eq("user_id", session.sub);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ starred: !!newStarredAt, starred_at: newStarredAt });
}
