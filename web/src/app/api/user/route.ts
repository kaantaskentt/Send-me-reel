import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

const VALID_STANCES = [
  "curious_not_started",
  "watching_not_doing",
  "tried_gave_up",
  "using_want_more",
];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  const [userRes, contextRes, creditsRes, triedRes, premiumUseRes] = await Promise.all([
    supabase.from("users").select("*").eq("id", session.sub).single(),
    supabase
      .from("user_contexts")
      .select("role, goal, content_preferences")
      .eq("user_id", session.sub)
      .single(),
    supabase
      .from("credits")
      .select("balance, lifetime_used")
      .eq("user_id", session.sub)
      .single(),
    // Phase 5: action-earns-depth gate. Count of analyses the user has marked
    // tried. Premium tabs unlock at >= 3.
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.sub)
      .not("tried_at", "is", null),
    // Grandfather rule: anyone who's ever generated action_items keeps the
    // premium tabs visible regardless of their tried count.
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.sub)
      .not("action_items", "is", null),
  ]);

  const lifetimeTriedCount = triedRes.count ?? 0;
  const hasUsedPremium = (premiumUseRes.count ?? 0) > 0;

  return NextResponse.json({
    user: userRes.data,
    context: contextRes.data,
    credits: creditsRes.data || { balance: 0, lifetime_used: 0 },
    lifetime_tried_count: lifetimeTriedCount,
    has_used_premium: hasUsedPremium,
    // Premium-tab gate: >= 3 tries OR previously used. transformation-plan §11.
    premium_tabs_unlocked: lifetimeTriedCount >= 3 || hasUsedPremium,
  });
}

/**
 * Phase 4 — atomic update of the four "personal lens" fields:
 *   display_name (first_name) — user can rename themselves to fix Yako-style data
 *   stance — one of four buckets, used only for verdict tone calibration
 *   intention — optional "one small commitment for the next two weeks"
 *   pattern_to_stop — optional "the pattern I want to step away from"
 *
 * All fields are optional in the body — only present keys are updated. Empty
 * string clears the field (saved as NULL).
 */
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const update: Record<string, string | null> = {};

  if ("display_name" in body) {
    const v = typeof body.display_name === "string" ? body.display_name.trim() : "";
    update.first_name = v.length > 0 ? v.slice(0, 80) : null;
  }
  if ("stance" in body) {
    const v = body.stance;
    if (v === null || v === "") {
      update.stance = null;
    } else if (typeof v === "string" && VALID_STANCES.includes(v)) {
      update.stance = v;
    } else {
      return NextResponse.json(
        { error: `stance must be one of: ${VALID_STANCES.join(", ")} (or null)` },
        { status: 400 },
      );
    }
  }
  if ("intention" in body) {
    const v = typeof body.intention === "string" ? body.intention.trim() : "";
    update.intention = v.length > 0 ? v.slice(0, 280) : null;
  }
  if ("pattern_to_stop" in body) {
    const v = typeof body.pattern_to_stop === "string" ? body.pattern_to_stop.trim() : "";
    update.pattern_to_stop = v.length > 0 ? v.slice(0, 280) : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("users")
    .update(update)
    .eq("id", session.sub);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: Object.keys(update) });
}
