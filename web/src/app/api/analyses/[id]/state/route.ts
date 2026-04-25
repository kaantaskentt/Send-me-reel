import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { pushToNotion } from "@/lib/notion-push";

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

  // Phase 5: auto-push to Notion on transition to "tried" — but only when this
  // is the first time this analysis goes to tried (no prior tried_at). This
  // makes Notion the user's tried-it archive without needing a manual button.
  // Failure here doesn't fail the state change — auto-push is best-effort.
  let notionAutoPushed = false;
  if (target === "tried" && !row.tried_at) {
    try {
      const { data: u } = await supabase
        .from("users")
        .select("notion_access_token, notion_database_id")
        .eq("id", session.sub)
        .single();

      if (u?.notion_access_token && u?.notion_database_id) {
        const { data: full } = await supabase
          .from("analyses")
          .select("verdict, transcript, visual_summary, source_url, platform, verdict_intent")
          .eq("id", id)
          .single();
        if (full?.verdict) {
          await pushToNotion(u.notion_access_token, u.notion_database_id, {
            verdict: full.verdict,
            transcript: full.transcript,
            visual_summary: full.visual_summary,
            source_url: full.source_url,
            platform: full.platform,
            verdict_intent: full.verdict_intent,
          });
          notionAutoPushed = true;
        }
      }
    } catch (err) {
      // Best-effort — never block the state change on Notion failure
      console.error("[state] Notion auto-push failed:", err);
    }
  }

  return NextResponse.json({
    success: true,
    state: target,
    tried_at: update.tried_at,
    set_aside_at: update.set_aside_at,
    notion_auto_pushed: notionAutoPushed,
  });
}
