import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: analysisId } = await params;
  const db = getSupabase();

  // Verify the analysis belongs to this user before returning its threads.
  const { data: analysis } = await db
    .from("analyses")
    .select("id")
    .eq("id", analysisId)
    .eq("user_id", session.sub)
    .single();

  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: threads, error } = await db
    .from("chat_threads")
    .select("id, title, updated_at")
    .eq("user_id", session.sub)
    .eq("analysis_id", analysisId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Failed to load threads" }, { status: 500 });
  }

  // Attach message counts in a single query to avoid N+1.
  const threadIds = (threads ?? []).map((t) => t.id);
  let countMap: Record<string, number> = {};

  if (threadIds.length > 0) {
    const { data: counts } = await db
      .from("chat_messages")
      .select("thread_id")
      .in("thread_id", threadIds);

    for (const row of counts ?? []) {
      countMap[row.thread_id] = (countMap[row.thread_id] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    threads: (threads ?? []).map((t) => ({
      id: t.id,
      title: t.title ?? "Conversation",
      updated_at: t.updated_at,
      message_count: countMap[t.id] ?? 0,
    })),
  });
}
