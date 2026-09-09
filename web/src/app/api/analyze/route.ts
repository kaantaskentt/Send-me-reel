import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { extractUrl, detectPlatform } from "@/lib/url-utils";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "URL is required" }, { status: 400 });
  const input = body as Record<string, unknown>;
  if (typeof input.url !== "string" || !input.url.trim() || input.url.length > 8192) {
    return NextResponse.json({ error: "A valid URL is required" }, { status: 400 });
  }
  if (input.note !== undefined && typeof input.note !== "string") return NextResponse.json({ error: "Note must be text" }, { status: 400 });
  const note = typeof input.note === "string" ? input.note.trim() : null;
  if (note && note.length > 4000) return NextResponse.json({ error: "Note must be 4,000 characters or fewer" }, { status: 400 });
  const url = extractUrl(input.url) || input.url.trim();
  const platform = detectPlatform(url);
  if (platform === "unknown") {
    return NextResponse.json({ error: "Unrecognized link. We support Instagram, TikTok, X, LinkedIn, YouTube, and article URLs." }, { status: 400 });
  }

  // Clients may retry an uncertain submission with the same idempotency key.
  const key = request.headers.get("Idempotency-Key");
  if (key && !UUID.test(key)) return NextResponse.json({ error: "Invalid idempotency key" }, { status: 400 });
  const analysisId = key || randomUUID();
  try {
    const { data, error } = await getSupabase().rpc("create_analysis_with_credit", {
      p_user_id: session.sub,
      p_source_url: url,
      p_platform: platform,
      p_note: note || null,
      p_source: "web",
      p_analysis_id: analysisId,
    });
    if (error?.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: "No analyses remaining" }, { status: 402 });
    }
    if (error?.message === "ANALYSIS_ID_CONFLICT") {
      return NextResponse.json({ error: "This request key was already used for another analysis" }, { status: 409 });
    }
    if (error || typeof data !== "string" || !UUID.test(data)) {
      // A missing migration, rejected charge, or malformed result never falls back
      // to a manual balance update or an uncharged insert.
      console.error("[analyze] Atomic submission unavailable; verify migration 022:", error?.message || "Invalid RPC result");
      return NextResponse.json({ error: "Analysis submission is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    return NextResponse.json({ analysisId: data });
  } catch (error) {
    console.error("[analyze] Atomic submission failed:", error);
    return NextResponse.json({ error: "Analysis submission is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
