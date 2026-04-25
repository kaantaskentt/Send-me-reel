/**
 * Quick smoke test for the rewritten Deep Dive (action-items) prompt.
 *
 * Pulls the Kimi K2.6 LinkedIn analysis from the live DB, runs the new
 * system prompt against its real content, and prints the output so we can
 * read whether the meta-describe-the-post failure mode is fixed.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ROUTE_FILE = path.join(
  process.cwd(),
  "web/src/app/api/analyses/[id]/action-items/route.ts",
);

function extractPrompt(): string {
  const src = fs.readFileSync(ROUTE_FILE, "utf-8");
  const match = src.match(/const ACTION_ITEMS_PROMPT = `([\s\S]*?)`;/);
  if (!match) throw new Error("could not find ACTION_ITEMS_PROMPT in route file");
  return match[1];
}

async function main() {
  const targetUrl = process.argv[2] || "kimi-k26"; // partial source_url match
  console.log(`Looking up analysis matching: ${targetUrl}\n`);

  const { data: rows } = await supabase
    .from("analyses")
    .select("id, source_url, platform, verdict, transcript, visual_summary, caption, metadata")
    .ilike("source_url", `%${targetUrl}%`)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(2);

  if (!rows?.length) {
    console.error("no matching analyses");
    process.exit(1);
  }

  const prompt = extractPrompt();
  console.log(`SYSTEM PROMPT length: ${prompt.length} chars\n`);

  for (const row of rows) {
    console.log(`\n${"═".repeat(80)}`);
    console.log(`#  ${row.platform.toUpperCase()}  ${row.source_url.slice(0, 80)}`);
    console.log(`${"═".repeat(80)}\n`);

    const parts: string[] = [];
    parts.push("--- CONTENT ANALYSIS ---");
    parts.push(`Platform: ${row.platform}`);
    if (row.verdict) parts.push(`Short verdict (already shown to user): ${row.verdict}`);
    if (row.caption) parts.push(`Caption: ${row.caption}`);
    if (row.transcript) parts.push(`Full transcript: ${row.transcript.slice(0, 3000)}`);
    if (row.visual_summary) parts.push(`Visual summary: ${row.visual_summary.slice(0, 1000)}`);
    const meta = row.metadata as Record<string, unknown> | null;
    if (meta?.authorUsername) parts.push(`Creator: @${meta.authorUsername}`);
    if (meta?.authorName) parts.push(`Creator name: ${meta.authorName}`);
    parts.push("\nGo deeper than the verdict. Pull from the full transcript and visuals — extract the three sections (insights, resources, try_this) PLUS the empty for_you array.");

    const userMsg = parts.join("\n");

    const resp = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 1200,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userMsg },
      ],
    });

    const text = resp.choices[0]?.message?.content?.trim() ?? "(empty)";

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    if (!parsed) {
      console.log("FAILED TO PARSE:", text);
      continue;
    }

    if (parsed.insights?.length) {
      console.log("💡 WHAT STOOD OUT:");
      for (const i of parsed.insights) console.log(`  • ${i.text}`);
      console.log();
    }

    if (parsed.resources?.length) {
      console.log("🔧 TOOLS THEY NAMED:");
      for (const r of parsed.resources) {
        console.log(`  • ${r.name}${r.link ? ` — ${r.link}` : ""}${r.price ? ` (${r.price})` : ""}`);
        if (r.description) console.log(`    ${r.description}`);
      }
      console.log();
    }

    if (parsed.try_this?.length) {
      console.log("🌱 TRY THIS:");
      for (const t of parsed.try_this) {
        console.log(`  ▸ ${t.title}`);
        console.log(`    ${t.description}`);
      }
      console.log();
    }

    if (parsed.for_you?.length) {
      console.log("‼ for_you NOT EMPTY — bug:", parsed.for_you);
    }

    // Look for meta-describing-the-post failure mode
    const allText = JSON.stringify(parsed).toLowerCase();
    const metaPhrases = [
      "the content introduces",
      "the post doesn't",
      "the post does not",
      "beyond this introduction",
      "the announcement was made",
      "the post is",
      "the article doesn't",
    ];
    const hits = metaPhrases.filter((p) => allText.includes(p));
    if (hits.length) {
      console.log(`✗ META-DESCRIBE FAILURES DETECTED:`);
      for (const h of hits) console.log(`    "${h}"`);
    } else {
      console.log(`✓ no meta-describe phrases — talks about the topic, not the post`);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
