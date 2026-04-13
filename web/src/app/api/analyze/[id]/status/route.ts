import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const db = getSupabase();

  const { data: analysis } = await db
    .from("analyses")
    .select("status, verdict, error_message")
    .eq("id", id)
    .eq("user_id", session.sub)
    .single();

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  // Staleness check — if pending for over 2 minutes, something went wrong
  if (analysis.status === "pending") {
    const { data: row } = await db
      .from("analyses")
      .select("created_at")
      .eq("id", id)
      .single();

    if (row) {
      const age = Date.now() - new Date(row.created_at).getTime();
      if (age > 2 * 60 * 1000) {
        return NextResponse.json({
          status: "failed",
          error: "Analysis timed out. Your credit has been refunded.",
        });
      }
    }
  }

  return NextResponse.json({
    status: analysis.status,
    verdict: analysis.status === "done" ? analysis.verdict : undefined,
    error: analysis.status === "failed" ? analysis.error_message : undefined,
  });
}
