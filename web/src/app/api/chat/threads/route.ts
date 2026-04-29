import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

function parseTitle(verdict: string | null): string {
  if (!verdict) return "Untitled";
  const match = verdict.match(/🔷\s*(.+)/);
  if (!match) return verdict.slice(0, 50);
  return match[1].split("—")[0]?.trim() || verdict.slice(0, 50);
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabase();

  const { data: threads, error } = await db
    .from("chat_threads")
    .select("id, title, updated_at, analysis_id, analyses(platform, verdict)")
    .eq("user_id", session.sub)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: "Failed to load threads" }, { status: 500 });
  }

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
    threads: (threads ?? []).map((t) => {
      const raw = t.analyses;
      const analysis = (Array.isArray(raw) ? raw[0] : raw) as { platform: string; verdict: string | null } | null;
      return {
        id: t.id,
        title: t.title ?? "Conversation",
        updated_at: t.updated_at,
        message_count: countMap[t.id] ?? 0,
        analysis_id: t.analysis_id,
        analysis_platform: analysis?.platform ?? "article",
        analysis_title: parseTitle(analysis?.verdict ?? null),
      };
    }),
  });
}
