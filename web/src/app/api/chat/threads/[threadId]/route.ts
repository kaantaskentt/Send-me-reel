import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  const db = getSupabase();

  // Verify thread ownership at the query level — wrong user_id returns nothing.
  const { data: thread } = await db
    .from("chat_threads")
    .select("id")
    .eq("id", threadId)
    .eq("user_id", session.sub)
    .single();

  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: messages, error } = await db
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  return NextResponse.json({
    messages: (messages ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });
}
