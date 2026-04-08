import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const intent = params.get("intent");
  const platform = params.get("platform");
  const search = params.get("search");
  const page = parseInt(params.get("page") || "1", 10);
  const limit = parseInt(params.get("limit") || "20", 10);
  const offset = (page - 1) * limit;

  const supabase = getSupabase();

  let query = supabase
    .from("analyses")
    .select(
      "id, source_url, platform, status, caption, metadata, verdict, verdict_intent, created_at, completed_at",
      { count: "exact" },
    )
    .eq("user_id", session.sub)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (intent && intent !== "all") {
    query = query.eq("verdict_intent", intent);
  }

  if (platform && platform !== "all") {
    query = query.eq("platform", platform);
  }

  if (search) {
    query = query.or(`verdict.ilike.%${search}%,transcript.ilike.%${search}%,caption.ilike.%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    analyses: data || [],
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
  });
}
