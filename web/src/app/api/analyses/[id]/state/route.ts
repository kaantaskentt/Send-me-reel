import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

type StateValue = "saved" | "tried" | "set_aside";

const VALID_STATES: StateValue[] = ["saved", "tried", "set_aside"];

/**
 * Phase 2 state machine: saved → tried | set_aside.
 *
 * POST /api/analyses/[id]/state  body: { state: "saved" | "tried" | "set_aside" }
 *
 * Both tried and set_aside are terminal-good states. Reverting to "saved"
 * is allowed (the user can change their mind).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { state?: string };

  if (!body.state || !VALID_STATES.includes(body.state as StateValue)) {
    return NextResponse.json(
      { error: `state must be one of: ${VALID_STATES.join(", ")}` },
      { status: 400 },
    );
  }
  const target = body.state as StateValue;

  const supabase = getSupabase();

  // Verify ownership before mutating
  const { data: row, error: fetchErr } = await supabase
    .from("analyses")
    .select("user_id, tried_at, set_aside_at")
    .eq("id", id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (row.user_id !== session.sub) {
    return NextResponse.json({ error: "Not your analysis" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const update: { tried_at: string | null; set_aside_at: string | null } = {
    tried_at: null,
    set_aside_at: null,
  };
  if (target === "tried") update.tried_at = now;
  if (target === "set_aside") update.set_aside_at = now;

  const { error: updateErr } = await supabase
    .from("analyses")
    .update(update)
    .eq("id", id)
    .eq("user_id", session.sub);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    state: target,
    tried_at: update.tried_at,
    set_aside_at: update.set_aside_at,
  });
}
