/**
 * Phase 1 smoke test for the new two-pass verdict pipeline.
 *
 * Pulls the 10 most recent completed analyses' raw content from Supabase,
 * re-runs them through the new generateVerdict(), and prints the new verdict
 * side-by-side with the old one currently stored in the DB.
 *
 * Usage:
 *   npx tsx scripts/smoke-test-verdicts.ts          # 10 most recent
 *   npx tsx scripts/smoke-test-verdicts.ts --limit=5
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY required (already in .env).
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { generateVerdict, renderForTelegram } from "../src/services/verdictGenerator.js";
import type { Platform } from "../src/pipeline/types.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : 10;

interface AnalysisRow {
  id: string;
  source_url: string;
  platform: string;
  transcript: string | null;
  visual_summary: string | null;
  caption: string | null;
  metadata: Record<string, unknown> | null;
  verdict: string | null;
  user_id: string;
  created_at: string;
}

async function main() {
  console.log(`\n==== Phase 1 verdict smoke test — ${LIMIT} analyses ====\n`);

  const { data, error } = await supabase
    .from("analyses")
    .select("id, source_url, platform, transcript, visual_summary, caption, metadata, verdict, user_id, created_at")
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error("Supabase error:", error);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.error("No completed analyses found.");
    process.exit(1);
  }

  const rows = data as AnalysisRow[];
  console.log(`Loaded ${rows.length} analyses. Generating new verdicts in parallel…\n`);

  const results = await Promise.all(
    rows.map(async (row, i) => {
      const idx = i + 1;
      try {
        // We pass an empty "userContext" — the new pipeline ignores it in Pass 1
        // but the type still requires it. This is a deliberate Phase 1 stub;
        // Phase 4 will remove userContext from the interface entirely.
        const newVerdict = await generateVerdict({
          transcript: row.transcript,
          visualSummary: row.visual_summary || "",
          caption: row.caption || "",
          metadata: row.metadata || {},
          userContext: { role: "", goal: "", contentPreferences: undefined, extendedContext: undefined } as never,
          platform: (row.platform || "instagram") as Platform,
          sourceUrl: row.source_url,
          userNote:
            (row.metadata as { userNote?: string } | null)?.userNote || undefined,
        });
        return { idx, row, newVerdict, error: null as string | null };
      } catch (err) {
        return {
          idx,
          row,
          newVerdict: null,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  // Print each side-by-side
  for (const r of results) {
    console.log(`\n${"─".repeat(80)}`);
    console.log(`#${r.idx}  ${r.row.platform.toUpperCase()}  ${r.row.source_url}`);
    console.log(`${"─".repeat(80)}`);
    console.log(`OLD VERDICT (currently in DB):`);
    console.log(r.row.verdict?.trim() || "(empty)");
    console.log(`\nNEW VERDICT — full (dashboard render):`);
    if (r.error) {
      console.log(`ERROR: ${r.error}`);
    } else {
      console.log(r.newVerdict);
      const tgRender = renderForTelegram(r.newVerdict);
      if (tgRender !== r.newVerdict) {
        console.log(`\nNEW VERDICT — Telegram render (🪜 stripped, ${tgRender.length} chars):`);
        console.log(tgRender);
      }
    }
    // Quick automated checks against the Phase 1 ship bar
    if (r.newVerdict) {
      const checks = runChecks(r.newVerdict);
      console.log(`\nCHECKS:`);
      for (const c of checks) console.log(`  ${c.pass ? "✓" : "✗"} ${c.name}`);
    }
  }

  // Aggregate scorecard
  const scored = results.filter((r) => r.newVerdict);
  const totals = {
    structureOk: 0,
    actionLine: 0,
    noHomework: 0,
    bannedWord: 0,
    profileRef: 0,
    underTargetTg: 0,
  };
  for (const r of scored) {
    const c = runChecks(r.newVerdict!);
    if (c[0].pass) totals.structureOk++;
    if (/^🌱/m.test(r.newVerdict!)) totals.actionLine++;
    if (r.newVerdict!.includes("🍵")) totals.noHomework++;
    if (!c[2].pass) totals.bannedWord++;
    if (!c[3].pass) totals.profileRef++;
    const tg = renderForTelegram(r.newVerdict!);
    if (tg.length <= 400) totals.underTargetTg++;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`SCORECARD vs. Phase 1 ship bar`);
  console.log(`${"═".repeat(80)}`);
  console.log(`  Structure conforms (📍 + 🌱/🍵):       ${totals.structureOk}/${scored.length}`);
  console.log(`  Has 🌱 action line:                     ${totals.actionLine}/${scored.length}`);
  console.log(`  Has 🍵 no-homework:                     ${totals.noHomework}/${scored.length}`);
  console.log(`  Banned words detected:                  ${totals.bannedWord} (must be 0)`);
  console.log(`  Profile references detected:            ${totals.profileRef} (must be 0)`);
  console.log(`  Telegram render ≤ 400 chars:            ${totals.underTargetTg}/${scored.length}`);
  console.log();
}

function runChecks(verdict: string) {
  const hasDescription = /^📍/m.test(verdict);
  const hasResolution = /^🌱/m.test(verdict) || /^🍵/m.test(verdict);
  const structureOk = hasDescription && hasResolution;

  const hasAction = /^🌱/m.test(verdict);

  const bannedWords = [
    "powerful", "robust", "incredible", "leverage", "optimize", "unlock",
    "supercharge", "actionable", "key takeaway", "pro tip", "deep dive",
    "Worth your time", "Skim it", "Skip", "10x", "game-changer",
    "valuable insights", "great content", "highly relevant", "I recommend",
    "stay ahead", "fall behind", "keep up", "exciting", "fascinating",
    "innovative", "cutting-edge",
  ];
  const bannedHit = bannedWords.find((w) =>
    new RegExp(`\\b${w.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "i").test(verdict),
  );
  const noBannedWords = !bannedHit;

  // Profile-bias detection: phrases like "your work", "your role", "your goal",
  // "your interest", "your X experience" that imply the model knew the reader's profession
  const profileBiasRe = /\byour\s+(work|role|goal|focus|interest|experience|profession|profile|stack|workflow|setup|background|industry|field)\b/i;
  const noProfileRefs = !profileBiasRe.test(verdict);

  const charCount = verdict.length;
  const underTarget = charCount <= 400;

  return [
    { name: `Structure conforms (📍 + 🌱 or 🍵)`, pass: structureOk },
    { name: `Has resolution (action OR no-homework)`, pass: hasAction || /🍵/.test(verdict) },
    { name: `No banned words${bannedHit ? ` (HIT: "${bannedHit}")` : ""}`, pass: noBannedWords },
    { name: `No profile references`, pass: noProfileRefs },
    { name: `Length ≤ 400 chars (actual ${charCount})`, pass: underTarget },
  ];
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
