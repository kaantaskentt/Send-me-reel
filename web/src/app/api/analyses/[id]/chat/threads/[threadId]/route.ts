import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: analysisId, threadId } = await params;
  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const db = getSupabase();

  const { data: thread } = await db
    .from("chat_threads")
    .select("id")
    .eq("id", threadId)
    .eq("user_id", session.sub)
    .eq("analysis_id", analysisId)
    .single();

  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await db
    .from("chat_threads")
    .update({ title })
    .eq("id", threadId);

  if (error) {
    return NextResponse.json({ error: "Failed to rename" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
