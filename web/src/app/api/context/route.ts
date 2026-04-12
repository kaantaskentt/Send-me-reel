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
    // Need role + goal for new profiles. content_preferences is optional.
    if (!role || !goal) {
      return NextResponse.json(
        { error: "Role and focus are required for new profiles" },
        { status: 400 },
      );
    }
    await supabase.from("user_contexts").insert(row);
  }

  // Mark user as onboarded (idempotent — safe to call every save)
  await supabase
    .from("users")
    .update({ onboarded: true })
    .eq("id", session.sub);

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  await supabase
    .from("user_contexts")
    .delete()
    .eq("user_id", session.sub);

  return NextResponse.json({ success: true });
}
