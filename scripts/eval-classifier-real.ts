/**
 * Real-content regression set — cases validated through production testing.
 * Each row is a URL pattern that fetches from the DB, plus the expected
 * classification result and a one-line verdict note.
 *
 * Run: npx tsx scripts/eval-classifier-real.ts
 *
 * Add new rows here whenever a real reel is manually reviewed and confirmed.
 * Tag: [real] to distinguish from the synthetic eval-classifier.ts rows.
 */
import { createClient } from "@supabase/supabase-js";
import { classifyContent } from "../src/services/contentClassifier.js";
import { config } from "../src/config.js";

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

interface RealCase {
  label: string;
  urlPattern: string;                    // ilike match against source_url in DB
  expectedCategory: string;
  expectedLane: string | null;           // null = no assertion (defensible call)
  verdictNote: string;                   // one-line observation on whether verdict felt right
}

const CASES: RealCase[] = [
  // --- [real] Validated through Ticket A/B/C testing (May 2026) ---

  {
    label: "MiroFish — open-source crowd simulation",
    urlPattern: "DXltuaWDmzd",
    expectedCategory: "named_tool",
    expectedLane: "open_it",
    verdictNote: "Correct at 0.96. 🌱 with mirofish.ai URL. Classifier and action line both clean.",
  },
  {
    label: "OpenClaw / Hormozi commentary",
    urlPattern: "DXhn6BvSCKX",
    expectedCategory: "commentary",
    expectedLane: "the_takeaway",
    verdictNote: "Correct at 0.95. 💭 The take fires. Argument stated directly without meta-description. Key test for commentary lane.",
  },
  {
    label: "Caveman — LinkedIn, transcript-null edge case",
    urlPattern: "save-tokens-while",
    expectedCategory: "named_tool",
    expectedLane: "open_it",
    verdictNote: "Correct at 0.89 via article scraper (LinkedIn caption-only, no transcript). Weaker signal still lands right.",
  },
  {
    label: "Auto Browser — open-source MCP browser agent",
    urlPattern: "DXkUQQqCRxS",
    expectedCategory: "named_tool",
    expectedLane: "open_it",
    verdictNote: "Correct at 0.96. 🌱 with github.com/LvcidPsyche/auto-browser. Clean.",
  },
  {
    label: "Frontend skills / Claude Code skills reel",
    urlPattern: "DXUcd-hiIL6",
    expectedCategory: "named_tool",           // classifier called named_tool at 0.93 (visual signal)
    expectedLane: null,                        // no strict assertion — defensible call, no single canonical subject
    verdictNote: "named_tool at 0.93 from visual signal (Magic MCP, Impeccable etc. visible). Defensible — no cleaner category. 🌱 fires.",
  },
  {
    label: "Vibeyard carousel — multi-agent IDE, image post",
    urlPattern: "DXZafdkglig",
    expectedCategory: "named_tool",
    expectedLane: "open_it",
    verdictNote: "Correct at 0.96. 🍵 fires (not 🌱) — model correctly judged multi-agent IDE too complex for one-step action. Anti-fabrication rule working as intended.",
  },
  {
    label: "Higgsfield — AI video stack open-source reel",
    urlPattern: "DXWu9F-E0La",
    expectedCategory: "named_tool",
    expectedLane: "open_it",
    verdictNote: "Classifier correct at 0.95. 🍵 fires because subjectResearcher returned wrong Higgsfield project (GPU orchestration, not AI video). Pre-existing researcher quality issue — not classifier fault.",
  },

  // --- [real] Validated through 8-link pipeline run (May 1 2026) ---

  {
    label: "webclaw — open-source web extraction toolkit for AI agents",
    urlPattern: "DXrgzklgLqN",
    expectedCategory: "named_tool",
    expectedLane: "open_it",
    verdictNote: "Correct at 0.95. Research found github.com/0xMassi/webclaw. 🍵 on action — no simple install step for a casual user, defensible.",
  },
  {
    label: "Even Realities G2 — Terminal Mode feature announcement",
    urlPattern: "DXrY60ejRwK",
    expectedCategory: "commentary",
    expectedLane: "the_takeaway",
    verdictNote: "commentary at 0.95. Caption announces named product feature but no go-try-it handle. Transcript was Korean garbage (music audio). Defensible call.",
  },
  {
    label: "Manus Cloud Computer — persistent Ubuntu machine feature (LinkedIn)",
    urlPattern: "7455639816508952577",
    expectedCategory: "named_tool",
    expectedLane: "open_it",
    verdictNote: "Correct at 0.96. Research found manus.im/blog/manus-cloud-computer. 🍵 — waitlist product, no immediate try step.",
  },
  {
    label: "Turkish smashed potatoes — recipe reel (non-English caption)",
    urlPattern: "DC1y12QtnCV",
    expectedCategory: "recipe",
    expectedLane: "save_for_later",
    verdictNote: "Correct at 0.99 via visual signal (transcript garbage). 📍 in Turkish matching caption language, 💾 action in English.",
  },
  {
    label: "Cheesy garlic & shallot dip — recipe reel",
    urlPattern: "DPzDGv9DMFh",
    expectedCategory: "recipe",
    expectedLane: "save_for_later",
    verdictNote: "Correct at 0.99 via visual signal (transcript garbage). Clean verdict end to end.",
  },
  {
    label: "NotebookLM study hack — sponsored technique reel",
    urlPattern: "DWmc_rdgEKn",
    expectedCategory: "technique",
    expectedLane: "open_it",
    verdictNote: "technique at 0.76 — creator_review also defensible (sponsored walkthrough of one tool). Research skipped (SEARCH_FIXED[technique]=false). Model inferred notebooklm.google.com from training — known-tool risk pattern.",
  },
  {
    label: "Full Body Mobility Routine — hip mobility exercise",
    urlPattern: "DTXua4TgSfc",
    expectedCategory: "exercise",
    expectedLane: "open_it",
    verdictNote: "Correct at 0.98 via visual (transcript garbage). Cleanest verdict in the run — specific 🌱 step, real 🪜 depth hint.",
  },

  // --- [real] Pending URL — sourced from production DB but URL not captured in scripts ---
  // Add Seedance and Stitch here when URLs are confirmed:
  //
  // { label: "Seedance — AI video generation tool", urlPattern: "???", expectedCategory: "named_tool", expectedLane: "open_it", verdictNote: "Correct at 0.95+. Clean." },
  // { label: "Stitch — ??? ", urlPattern: "???", expectedCategory: "named_tool", expectedLane: "open_it", verdictNote: "Correct at 0.95+. Clean." },
];

interface ResultRow {
  label: string;
  passed: boolean;
  predictedCategory: string;
  expectedCategory: string;
  predictedLane: string;
  expectedLane: string | null;
  confidence: number;
  verdictNote: string;
  found: boolean;
}

async function run() {
  console.log(`Running real-content regression set (${CASES.length} cases)...\n`);

  const results: ResultRow[] = [];

  for (const tc of CASES) {
    const { data } = await supabase
      .from("analyses")
      .select("source_url, platform, caption, transcript, visual_summary")
      .eq("status", "done")
      .ilike("source_url", `%${tc.urlPattern}%`)
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      console.log(`NOT FOUND: ${tc.label} (pattern: ${tc.urlPattern})`);
      results.push({
        label: tc.label,
        passed: false,
        predictedCategory: "—",
        expectedCategory: tc.expectedCategory,
        predictedLane: "—",
        expectedLane: tc.expectedLane,
        confidence: 0,
        verdictNote: tc.verdictNote,
        found: false,
      });
      continue;
    }

    const result = await classifyContent({
      transcript: data.transcript ?? null,
      caption: data.caption ?? "",
      visualSummary: data.visual_summary ?? "",
      platform: data.platform ?? "unknown",
      sourceUrl: data.source_url ?? "",
    });

    const catOk = result.category === tc.expectedCategory;
    const laneOk = tc.expectedLane === null || result.action_lane === tc.expectedLane;
    const passed = catOk && laneOk;

    results.push({
      label: tc.label,
      passed,
      predictedCategory: result.category,
      expectedCategory: tc.expectedCategory,
      predictedLane: result.action_lane,
      expectedLane: tc.expectedLane,
      confidence: result.confidence,
      verdictNote: tc.verdictNote,
      found: true,
    });
  }

  const found = results.filter((r) => r.found);
  const total = found.length;
  const passing = found.filter((r) => r.passed).length;

  console.log("=== RESULTS ===\n");

  for (const r of results) {
    if (!r.found) {
      console.log(`⚠️  NOT FOUND  ${r.label}`);
      continue;
    }
    const mark = r.passed ? "✅" : "❌";
    const laneStr = r.expectedLane === null ? "(no assert)" : r.expectedLane;
    console.log(`${mark}  [${r.confidence.toFixed(2)}]  ${r.label}`);
    console.log(`     category: ${r.predictedCategory} (expected: ${r.expectedCategory})`);
    console.log(`     lane:     ${r.predictedLane} (expected: ${laneStr})`);
    console.log(`     note:     ${r.verdictNote}`);
    console.log();
  }

  console.log(`SCORE: ${passing}/${total} found cases passing`);
  if (total < CASES.length) {
    console.log(`(${CASES.length - total} case(s) not found in DB — check urlPattern or run fresh analysis)`);
  }
}

run().catch(console.error);
