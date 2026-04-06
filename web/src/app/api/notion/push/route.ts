import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { pushToNotion } from "@/lib/notion-push";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { analysisId } = await request.json();
  if (!analysisId) {
    return NextResponse.json(
      { error: "analysisId is required" },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // Get user's Notion credentials
  const { data: user } = await supabase
    .from("users")
    .select("notion_access_token, notion_database_id")
    .eq("id", session.sub)
    .single();

  if (!user?.notion_access_token || !user?.notion_database_id) {
    return NextResponse.json(
      { error: "Notion not connected. Set up Notion first." },
      { status: 400 },
    );
  }

  // Get the analysis
  const { data: analysis } = await supabase
    .from("analyses")
    .select("verdict, transcript, visual_summary, source_url, platform, verdict_intent")
    .eq("id", analysisId)
    .eq("user_id", session.sub)
    .single();

  if (!analysis || !analysis.verdict) {
    return NextResponse.json(
      { error: "Analysis not found" },
      { status: 404 },
    );
  }

  try {
    const result = await pushToNotion(
      user.notion_access_token,
      user.notion_database_id,
      analysis,
    );
    return NextResponse.json({ success: true, url: result.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
