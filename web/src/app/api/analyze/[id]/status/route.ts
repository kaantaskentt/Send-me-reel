import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { analysisProgress } from "@/lib/analysis-progress";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }
  try {
    const { data: analysis, error } = await getSupabase()
      .from("analyses")
      .select("status, verdict, created_at, credits_reserved_at, credits_refunded_at")
      .eq("id", id)
      .eq("user_id", session.sub)
      .maybeSingle();

    if (error) throw new Error("Status read failed");

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const progress = analysisProgress(analysis);
    return NextResponse.json({
      ...progress,
      verdict: analysis.status === "done" ? analysis.verdict : undefined,
      error: analysis.status === "failed" ? progress.message : undefined,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "We couldn’t check your link. Try again in a moment." }, { status: 503 });
  }
}
