import { createClient } from "@supabase/supabase-js";
import { classifyContent } from "../src/services/contentClassifier.js";
import { config } from "../src/config.js";

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

const MISS_URL_PATTERNS = [
  { label: "Caveman",    pattern: "save-tokens-while" },
  { label: "OpenClawBot", pattern: "DXhn6BvSCKX" },
  { label: "Kimi K2.6",  pattern: "meet-kimi-k26" },
];

async function run() {
  for (const { label, pattern } of MISS_URL_PATTERNS) {
    const { data, error } = await supabase
      .from("analyses")
      .select("source_url, platform, caption, transcript, visual_summary, verdict")
      .eq("status", "done")
      .ilike("source_url", `%${pattern}%`)
      .not("transcript", "is", null)
      .limit(1)
      .single();

    if (error || !data) {
      // Try without requiring transcript
      const { data: d2 } = await supabase
        .from("analyses")
        .select("source_url, platform, caption, transcript, visual_summary, verdict")
        .eq("status", "done")
        .ilike("source_url", `%${pattern}%`)
        .limit(1)
        .single();

      if (!d2) {
        console.log(`${label}: no row found\n`);
        continue;
      }

      console.log(`${label} (no transcript stored):`);
      console.log(`  transcript: null`);
      console.log(`  visual_summary: ${d2.visual_summary ? d2.visual_summary.slice(0, 200) : "null"}`);
      console.log(`  caption: ${(d2.caption ?? "").slice(0, 150)}`);
      console.log();
      continue;
    }

    console.log(`\n=== ${label} ===`);
    console.log(`URL: ${data.source_url}`);
    console.log(`Transcript (first 400 chars): ${(data.transcript ?? "").slice(0, 400)}`);
    console.log(`Visual summary: ${(data.visual_summary ?? "").slice(0, 300)}`);
    console.log(`Caption (first 200 chars): ${(data.caption ?? "").slice(0, 200)}`);

    // Caption-only (what we tested before)
    const captionOnly = await classifyContent({
      transcript: null,
      caption: data.caption ?? "",
      visualSummary: "",
      platform: data.platform,
      sourceUrl: data.source_url,
    });

    // Full context
    const fullContext = await classifyContent({
      transcript: data.transcript ?? null,
      caption: data.caption ?? "",
      visualSummary: data.visual_summary ?? "",
      platform: data.platform,
      sourceUrl: data.source_url,
    });

    console.log(`\n  Caption-only:  ${captionOnly.category} (conf ${captionOnly.confidence.toFixed(2)})`);
    console.log(`  Full context:  ${fullContext.category} (conf ${fullContext.confidence.toFixed(2)})`);
    const flipped = captionOnly.category !== fullContext.category;
    console.log(`  Flipped: ${flipped ? "YES ✅" : "NO ❌"}`);
    console.log();
  }
}

run().catch(console.error);
