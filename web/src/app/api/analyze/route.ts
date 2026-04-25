import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { extractUrl, detectPlatform } from "@/lib/url-utils";
import { classifyUrl, shouldRefuse } from "@/lib/vertical-classifier";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const rawUrl: string | undefined = body?.url;
  const note: string | undefined = typeof body?.note === "string" ? body.note.trim() : undefined;
  const force: boolean = body?.force === true;
  if (!rawUrl || typeof rawUrl !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Extract clean URL (handles "Check this out https://..." text)
  const url = extractUrl(rawUrl) || rawUrl.trim();
  const platform = detectPlatform(url);

  if (platform === "unknown") {
    return NextResponse.json(
      { error: "Unrecognized link. We support Instagram, TikTok, X, LinkedIn, YouTube, and article URLs." },
      { status: 400 },
    );
  }

  // Phase 4 — soft vertical filter. Refuse non-AI/tech/business with a confirmation
  // prompt the frontend can re-submit with `force: true`. No charge on refusal.
  if (!force) {
    const decision = await classifyUrl(url, note);
    if (shouldRefuse(decision)) {
      return NextResponse.json(
        {
          requiresConfirmation: true,
          topic: decision.reason || "this kind of content",
          message: `This looks like ${decision.reason || "non-tech content"}. I'm built for the AI / tech / business stuff — I won't do my best work here.`,
        },
        { status: 422 },
      );
    }
  }

  const db = getSupabase();
  const userId = session.sub;

  // Check credits
  const { data: creditRow } = await db
    .from("credits")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (!creditRow || creditRow.balance <= 0) {
    return NextResponse.json({ error: "No analyses remaining" }, { status: 402 });
  }

  // Deduct one credit
  const { error: deductErr } = await db.rpc("deduct_credit", { p_user_id: userId });
  if (deductErr) {
    // Fallback: manual deduction
    await db
      .from("credits")
      .update({ balance: creditRow.balance - 1 })
      .eq("user_id", userId);
  }

  // Create pending analysis for the queue worker to pick up.
  // Store the user's note in metadata so queueWorker → executePipeline can read it.
  const { data: analysis, error: insertErr } = await db
    .from("analyses")
    .insert({
      user_id: userId,
      source_url: url,
      platform,
      status: "pending",
      source: "web",
      metadata: note ? { userNote: note } : null,
    })
    .select("id")
    .single();

  if (insertErr || !analysis) {
    return NextResponse.json({ error: "Failed to create analysis" }, { status: 500 });
  }

  return NextResponse.json({ analysisId: analysis.id });
}
