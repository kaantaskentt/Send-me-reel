import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

/**
 * Phase 6 — internal metrics endpoint. Computes the four key numbers we
 * watch to know if the bridge is working:
 *
 *   tried_rate           — primary north star. tries / (tries + set_asides + saved-unresolved-7d)
 *   median_ttft_days     — median days from save to "tried" toggle
 *   set_aside_rate       — informational, not a target
 *   ghost_rate           — anti-metric: % of analyses with no resolution after 7 days
 *
 * Auth gate: only your own user (the admin email is checked against the
 * ADMIN_USER_EMAIL env var). For now, we keep this internal-only.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_USER_EMAIL;
  if (!adminEmail) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
  }

  const supabase = getSupabase();
  const { data: me } = await supabase
    .from("users")
    .select("email")
    .eq("id", session.sub)
    .single();
  if (!me || me.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 7-day window for the rolling north star
  const [
    triedLast7,
    setAsideLast7,
    savedUnresolvedLast7,
    triedSamples,
    triedLast30,
    setAsideLast30,
    ghostLast30,
    perStanceLast30,
  ] = await Promise.all([
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("status", "done")
      .gte("created_at", sevenDaysAgo)
      .not("tried_at", "is", null),
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("status", "done")
      .gte("created_at", sevenDaysAgo)
      .not("set_aside_at", "is", null),
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("status", "done")
      .gte("created_at", sevenDaysAgo)
      .is("tried_at", null)
      .is("set_aside_at", null),
    // For median time-to-first-try: pull the timestamps and compute client-side.
    // Limited to 1000 most recent tried-it events.
    supabase
      .from("analyses")
      .select("created_at, tried_at")
      .eq("status", "done")
      .not("tried_at", "is", null)
      .order("tried_at", { ascending: false })
      .limit(1000),
    // 30-day window for set-aside rate + ghost rate
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("status", "done")
      .gte("created_at", thirtyDaysAgo)
      .not("tried_at", "is", null),
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("status", "done")
      .gte("created_at", thirtyDaysAgo)
      .not("set_aside_at", "is", null),
    // Ghost rate: created > 7 days ago, never resolved
    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("status", "done")
      .gte("created_at", thirtyDaysAgo)
      .lt("created_at", sevenDaysAgo)
      .is("tried_at", null)
      .is("set_aside_at", null),
    // Per-stance breakdown: join analyses → users.stance
    supabase
      .from("users")
      .select("stance")
      .not("stance", "is", null),
  ]);

  const tried7 = triedLast7.count ?? 0;
  const setAside7 = setAsideLast7.count ?? 0;
  const savedUnresolved7 = savedUnresolvedLast7.count ?? 0;
  const denom7 = tried7 + setAside7 + savedUnresolved7;

  const tried30 = triedLast30.count ?? 0;
  const setAside30 = setAsideLast30.count ?? 0;
  const ghost30 = ghostLast30.count ?? 0;

  // Median time-to-first-try (in days)
  const ttftDays = (triedSamples.data ?? [])
    .map((r) => {
      if (!r.tried_at || !r.created_at) return null;
      const d = (new Date(r.tried_at).getTime() - new Date(r.created_at).getTime()) / (24 * 60 * 60 * 1000);
      return d >= 0 ? d : null;
    })
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);
  const medianTtft = ttftDays.length === 0 ? null : ttftDays[Math.floor(ttftDays.length / 2)];

  // Stance distribution
  const stanceCounts: Record<string, number> = {};
  for (const u of perStanceLast30.data ?? []) {
    if (!u.stance) continue;
    stanceCounts[u.stance] = (stanceCounts[u.stance] ?? 0) + 1;
  }

  return NextResponse.json({
    window_days: 7,
    tried_rate: denom7 === 0 ? null : tried7 / denom7,
    tried_rate_target: 0.25, // strategy.md §15
    counts_last_7d: {
      tried: tried7,
      set_aside: setAside7,
      saved_unresolved: savedUnresolved7,
      total: denom7,
    },
    median_time_to_first_try_days: medianTtft,
    median_ttft_target_days: 4,
    set_aside_rate_30d:
      tried30 + setAside30 === 0 ? null : setAside30 / (tried30 + setAside30),
    ghost_rate_30d:
      tried30 + setAside30 + ghost30 === 0 ? null : ghost30 / (tried30 + setAside30 + ghost30),
    ghost_rate_target_max: 0.5,
    stance_distribution: stanceCounts,
  });
}
