import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data } = await supabase
    .from("user_contexts")
    .select("role, goal, content_preferences, extended_context")
    .eq("user_id", session.sub)
    .single();

  return NextResponse.json({
    context: data
      ? {
          role: data.role,
          goal: data.goal,
          content_preferences: data.content_preferences,
          extended_context: data.extended_context,
        }
      : null,
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { role, goal, content_preferences, extended_context } = body;

  const supabase = getSupabase();

  // Check if context exists
  const { data: existing } = await supabase
    .from("user_contexts")
    .select("id")
    .eq("user_id", session.sub)
    .single();

  const row: Record<string, unknown> = { user_id: session.sub };
  if (role !== undefined) row.role = role;
  if (goal !== undefined) row.goal = goal;
  if (content_preferences !== undefined)
    row.content_preferences = content_preferences;
  if (extended_context !== undefined)
    row.extended_context = extended_context;

  if (existing) {
    await supabase
      .from("user_contexts")
      .update(row)
      .eq("id", existing.id);
  } else {
    // Need all required fields for insert
    if (!role || !goal || !content_preferences) {
      return NextResponse.json(
        { error: "Role, goal, and content preferences are required for new profiles" },
        { status: 400 },
      );
    }
    await supabase.from("user_contexts").insert(row);
  }

  return NextResponse.json({ success: true });
}
