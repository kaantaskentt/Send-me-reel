import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// GET — list todos for an analysis
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: analysisId } = await params;
  const supabase = getSupabase();

  const { data } = await supabase
    .from("analysis_todos")
    .select("id, title, completed, position, created_at, completed_at")
    .eq("analysis_id", analysisId)
    .eq("user_id", session.sub)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  return NextResponse.json({ todos: data || [] });
}

// POST — create a new todo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: analysisId } = await params;
  const { title } = await request.json();

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Get the next position
  const { data: existing } = await supabase
    .from("analysis_todos")
    .select("position")
    .eq("analysis_id", analysisId)
    .eq("user_id", session.sub)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("analysis_todos")
    .insert({
      analysis_id: analysisId,
      user_id: session.sub,
      title: title.trim(),
      position: nextPosition,
    })
    .select("id, title, completed, position, created_at, completed_at")
    .single();

  if (error) {
    console.error("Todo create error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }

  return NextResponse.json({ todo: data });
}

// PATCH — toggle completed or update title
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await params; // consume params even though we use todoId from body
  const { todoId, completed, title } = await request.json();

  if (!todoId) {
    return NextResponse.json({ error: "todoId is required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const updates: Record<string, unknown> = {};

  if (typeof completed === "boolean") {
    updates.completed = completed;
    updates.completed_at = completed ? new Date().toISOString() : null;
  }
  if (typeof title === "string" && title.trim()) {
    updates.title = title.trim();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("analysis_todos")
    .update(updates)
    .eq("id", todoId)
    .eq("user_id", session.sub)
    .select("id, title, completed, position, created_at, completed_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ todo: data });
}

// DELETE — remove a todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await params;
  const { todoId } = await request.json();

  if (!todoId) {
    return NextResponse.json({ error: "todoId is required" }, { status: 400 });
  }

  const supabase = getSupabase();

  await supabase
    .from("analysis_todos")
    .delete()
    .eq("id", todoId)
    .eq("user_id", session.sub);

  return NextResponse.json({ success: true });
}
