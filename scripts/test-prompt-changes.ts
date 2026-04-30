/**
 * Verifies the two prompt changes from Apr 30:
 *   1. subjectExtractor — new null-return case for multi-tool method walkthroughs
 *   2. verdictGenerator — research is background context, creator's argument takes priority
 *
 * Uses crafted inputs that mirror the exact failure patterns (no video scraping).
 * Run: npx tsx scripts/test-prompt-changes.ts
 */

import "dotenv/config";
import { extractSubject } from "../src/services/subjectExtractor.js";
import { generateVerdict } from "../src/services/verdictGenerator.js";
import type { SubjectResearch } from "../src/services/subjectResearcher.js";

const sep = (l: string) => `\n${"═".repeat(70)}\n${l}\n${"═".repeat(70)}`;
const sub = (l: string) => `\n${"─".repeat(50)}\n${l}\n${"─".repeat(50)}`;

// ─────────────────────────────────────────────────────────────────────────────
// CASE 1 — POLYMARKET + CLAUDE + NAUTILUS (Option 1 fix)
// Expected: extractor returns NULL → no enrichment → verdict from transcript only
// Before fix: extractor picked "Claude" or "Nautilus", produced Wikipedia-style definition
// ─────────────────────────────────────────────────────────────────────────────
const polymarketInput = {
  caption:
    "How I use Claude and Nautilus to trade on Polymarket. Full setup walkthrough.",
  transcript:
    "Today I'm walking through my full Polymarket betting setup. First: pip install nautilus-trader. " +
    "Then I load my Claude API key. The workflow is: paste a Polymarket question into Claude with " +
    "the last 30 days of price data, Claude reasons through the probabilities, I feed that output " +
    "into Nautilus's execution engine which handles the order routing. The key insight is that " +
    "Claude's reasoning is the signal and Nautilus handles the math-kernel execution — neither " +
    "tool alone would work. Let me show you the pip install step by step.",
  visualSummary:
    "Terminal showing pip install nautilus-trader. Claude chat interface with market question. " +
    "Nautilus dashboard with order execution panel. Python script with API keys redacted.",
  platform: "youtube",
  sourceUrl: "https://www.youtube.com/watch?v=example-polymarket",
  metadata: {},
};

// ─────────────────────────────────────────────────────────────────────────────
// CASE 2 — MALI GPU CREATOR ARGUMENT (Option 2 fix)
// Expected: verdict reflects creator's architectural argument, NOT Wikipedia definition of Mali
// Before fix: research injected as authoritative → verdict said "Mali is ARM's GPU IP core family"
//
// We craft the Wikipedia-style research the system WOULD have fetched,
// and a transcript with the creator's actual argument. The verdict generator
// should now use the research only for naming/URL and build the verdict
// from the transcript argument.
// ─────────────────────────────────────────────────────────────────────────────
const maliTranscript =
  "The fundamental problem with Mali is that it uses a tile-based deferred rendering " +
  "architecture designed for a world before modern game engines. Every game now uses " +
  "deferred lighting which requires repeated framebuffer reads — and Mali's architecture " +
  "penalizes that pattern hard. Meanwhile Apple's GPU and Qualcomm's Adreno made the " +
  "opposite tradeoff. The Mali engineers made an architectural bet in 2012 that's aged " +
  "poorly. This is why Mali devices run 40% below their thermal budget while still " +
  "generating heat: the pipeline is stalled waiting on memory reads. Arm knows this, " +
  "which is why Immortalis exists — but the budget tier is stuck on Mali for another " +
  "3-5 years. If you're buying a budget Android, the GPU architecture is the hidden " +
  "reason it feels slow in games by year two.";

const maliResearch: SubjectResearch = {
  subject: "Mali GPU",
  type: "concept",
  summary:
    "Mali is a family of GPU IP cores developed by Arm, used in mobile system-on-chip " +
    "designs for graphics and compute tasks.",
  canonicalUrl: "https://en.wikipedia.org/wiki/Mali_(processor)",
  sourceUrls: [
    "https://en.wikipedia.org/wiki/Mali_(processor)",
    "https://developer.arm.com/Processors/Mali",
  ],
  snippets: [
    "Mali is a range of GPU IP cores developed and licensed by Arm Holdings.",
    "Mali GPUs use tile-based deferred rendering (TBDR) architecture.",
  ],
  fetchedAt: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// CASE 3 — KIMI K2.6 PRODUCT LAUNCH (safety check — should NOT degrade)
// Expected: verdict still includes version numbers, benchmark scores, GitHub URL from research
// The benchmark numbers come ONLY from research (not in the transcript) so they must survive.
// ─────────────────────────────────────────────────────────────────────────────
const kimiTranscript =
  "Moonshot just dropped Kimi K2.6 and the benchmark numbers are impressive. " +
  "They're releasing it open source. The cost per token on coding tasks is way below " +
  "what you'd pay for the equivalent performance from other providers. " +
  "The context window is huge — over 200k tokens. Worth testing if you do a lot of coding work.";

const kimiResearch: SubjectResearch = {
  subject: "Kimi K2.6",
  type: "model",
  summary:
    "Kimi K2.6 is Moonshot AI's open-source coding model. 1T total parameters, " +
    "32B active via MoE, 256k context window. SWE-Bench Pro 58.6.",
  canonicalUrl: "https://github.com/moonshotai/Kimi-K2",
  sourceUrls: ["https://github.com/moonshotai/Kimi-K2"],
  snippets: [
    "SWE-Bench Pro score of 58.6, open-weights under Apache 2.0.",
    "~10x cheaper than Claude Opus 4.6 on coding benchmarks.",
    "Released January 27, 2026.",
  ],
  fetchedAt: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// CASE 4 — MEM0 SINGLE-TOOL DEMO (safety check — should NOT degrade)
// Expected: verdict names Mem0, gives canonical URL, describes what the demo showed
// ─────────────────────────────────────────────────────────────────────────────
const mem0Transcript =
  "Quick walkthrough of Mem0 — it's an open-source memory layer for AI agents. " +
  "The Python SDK is dead simple: mem0.add(), mem0.search(). Takes five minutes to " +
  "replace whatever ad-hoc memory you were rolling yourself. Persistent across sessions. " +
  "The managed cloud tier is free up to 1000 memories. Repo is at github.com/mem0ai/mem0.";

const mem0Research: SubjectResearch = {
  subject: "Mem0",
  type: "tool",
  summary:
    "Mem0 is an open-source memory layer for AI agents, providing persistent memory " +
    "across sessions via a simple Python SDK. Available at github.com/mem0ai/mem0.",
  canonicalUrl: "https://github.com/mem0ai/mem0",
  sourceUrls: ["https://github.com/mem0ai/mem0", "https://docs.mem0.ai"],
  snippets: [
    "pip install mem0ai — add persistent memory to any AI agent in minutes.",
    "Open-source, MIT license, 25k+ GitHub stars.",
  ],
  fetchedAt: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// CASE 5 — GENERAL AI NEWS REEL (edge case — should still work, not get worse)
// GPT-5 launch announcement with creator commentary over it.
// ─────────────────────────────────────────────────────────────────────────────
const newsTranscript =
  "OpenAI just launched GPT-5 and it's not what people expected. The model is actually " +
  "a reasoning-focused system, not just a bigger GPT-4. No multimodal improvements in " +
  "this version — they pushed that to a separate release track. The context window stayed " +
  "at 128k. Pricing is basically the same as GPT-4o. I think this is a defensive play " +
  "against o3 cannibalization more than a genuine capability jump.";

const newsResearch: SubjectResearch = {
  subject: "GPT-5",
  type: "model",
  summary:
    "GPT-5 is OpenAI's latest language model, focusing on reasoning improvements " +
    "over GPT-4. 128k context, same pricing tier as GPT-4o.",
  canonicalUrl: "https://openai.com/gpt-5",
  sourceUrls: ["https://openai.com/gpt-5", "https://openai.com/blog/gpt-5"],
  snippets: [
    "GPT-5 focuses on reasoning over raw capability, released Q1 2026.",
    "128k context window, same pricing as GPT-4o.",
  ],
  fetchedAt: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────

async function runExtractorCase(label: string, input: Parameters<typeof extractSubject>[0]) {
  const r = await extractSubject(input);
  const summary = r
    ? `EXTRACTED: "${r.name}" (${r.type}, confidence ${r.confidence})`
    : "NULL → no enrichment (correct for method/technique content)";
  console.log(`${label}\n  → ${summary}`);
  return r;
}

async function runVerdictCase(
  label: string,
  transcript: string,
  research: SubjectResearch | null,
  platform = "instagram",
  sourceUrl = "https://example.com",
) {
  const verdict = await generateVerdict({
    transcript,
    visualSummary: "",
    caption: "",
    metadata: {},
    userContext: { role: "", goal: "" },
    platform: platform as Parameters<typeof generateVerdict>[0]["platform"],
    sourceUrl,
    subjectResearch: research,
  });
  console.log(`${label}\n`);
  console.log(verdict);
}

async function main() {
  // ── PART A: Extractor tests ──────────────────────────────────────────────
  console.log(sep("PART A — EXTRACTOR: does it return null for method walkthroughs?"));

  console.log(sub("CASE 1 — Polymarket + Claude + Nautilus (should → null)"));
  await runExtractorCase("Polymarket multi-tool method", polymarketInput);

  console.log(sub("CASE 3 — Kimi K2.6 announcement (should → extracted)"));
  await runExtractorCase("Kimi K2.6", {
    caption: "Moonshot AI launched Kimi K2.6 — open source, 256k context, SWE-Bench Pro 58.6.",
    transcript: kimiTranscript,
    visualSummary: "",
    platform: "instagram",
    sourceUrl: "https://instagram.com/...",
    metadata: {},
  });

  console.log(sub("CASE 4 — Mem0 single-tool demo (should → extracted)"));
  await runExtractorCase("Mem0", {
    caption: "Mem0 walkthrough — open-source memory layer for AI agents. github.com/mem0ai/mem0",
    transcript: mem0Transcript,
    visualSummary: "",
    platform: "instagram",
    sourceUrl: "https://instagram.com/...",
    metadata: {},
  });

  // ── PART B: Verdict tests ────────────────────────────────────────────────
  console.log(sep("PART B — VERDICT GENERATOR: does creator's argument survive research?"));

  console.log(sub("CASE 1 — Polymarket (no research since extractor returns null)"));
  await runVerdictCase(
    "Polymarket verdict — transcript only, no research:",
    polymarketInput.transcript,
    null,
    "youtube",
    "https://www.youtube.com/watch?v=example-polymarket",
  );

  console.log(sub("CASE 2 — Mali GPU (research = Wikipedia definition; transcript = creator argument)"));
  console.log("Research injected:\n  " + maliResearch.summary);
  console.log("  Canonical URL: " + maliResearch.canonicalUrl);
  console.log("  [Test: verdict should reflect creator's argument, not this Wikipedia summary]\n");
  await runVerdictCase(
    "Mali GPU verdict — should use transcript argument, not Wikipedia:",
    maliTranscript,
    maliResearch,
    "youtube",
    "https://www.youtube.com/watch?v=example-mali",
  );

  console.log(sub("CASE 3 — Kimi K2.6 (safety check: benchmark numbers must survive from research)"));
  console.log("Research injected:\n  " + kimiResearch.summary);
  console.log("  Canonical: " + kimiResearch.canonicalUrl);
  console.log("  [Test: verdict should still include 58.6, 32B MoE, github.com/moonshotai/Kimi-K2]\n");
  await runVerdictCase(
    "Kimi K2.6 verdict — benchmark numbers and GitHub URL must appear:",
    kimiTranscript,
    kimiResearch,
    "instagram",
    "https://instagram.com/...",
  );

  console.log(sub("CASE 4 — Mem0 (single-tool demo — research adds URL)"));
  await runVerdictCase(
    "Mem0 verdict — should name the tool, give GitHub URL, describe what demo showed:",
    mem0Transcript,
    mem0Research,
    "instagram",
    "https://instagram.com/...",
  );

  console.log(sub("CASE 5 — GPT-5 news reel with creator commentary"));
  console.log("Research injected:\n  " + newsResearch.summary);
  console.log("  [Test: verdict should reflect creator's 'defensive play' take, not just 'GPT-5 is X']\n");
  await runVerdictCase(
    "GPT-5 news reel — creator's commentary should be the verdict:",
    newsTranscript,
    newsResearch,
    "instagram",
    "https://instagram.com/...",
  );

  console.log(sep("DONE — review verdicts above against expected behavior"));
}

main().catch((err) => {
  console.error("Test script error:", err);
  process.exit(1);
});
