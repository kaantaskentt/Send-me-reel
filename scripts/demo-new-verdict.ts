/**
 * Apr 26 — agentic understanding layer demo.
 *
 * Runs the NEW pipeline (subject extractor → web search → Pass 1 → Pass 2)
 * against a simulated input that matches a real LinkedIn post about Kimi K2.6.
 * Prints every intermediate so you can see exactly what changed vs. the old
 * "the content didn't share a demo or link" output.
 *
 * No DB access, no PII. Just the prompt path.
 *
 * Usage: npx tsx scripts/demo-new-verdict.ts
 * Env: OPENAI_API_KEY (already in .env)
 */

import "dotenv/config";
import { extractSubject } from "../src/services/subjectExtractor.js";
import { researchSubject } from "../src/services/subjectResearcher.js";
import { generateVerdict, renderForTelegram } from "../src/services/verdictGenerator.js";

// Simulated input — matches what Apify would return scraping a real Moonshot
// LinkedIn announcement post about Kimi K2.6. Same shape the orchestrator
// would feed in.
const KIMI_INPUT = {
  caption:
    "Excited to share Kimi K2.6 by Moonshot AI. Our new release pushes open-source coding capability with longer-horizon and proactive agents. Looking forward to what builders make with it.",
  transcript: null,
  visualSummary: "",
  metadata: { authorName: "Moonshot AI", authorUsername: "moonshot-ai" },
  platform: "linkedin" as const,
  sourceUrl: "https://www.linkedin.com/feed/update/urn:li:activity:placeholder-kimi-post",
};

async function main() {
  const sep = (label: string) => `\n${"─".repeat(70)}\n${label}\n${"─".repeat(70)}`;

  console.log(sep("INPUT — what Apify scraped (no transcript, no visuals — it's a text post)"));
  console.log(`Platform:  ${KIMI_INPUT.platform}`);
  console.log(`Author:    ${KIMI_INPUT.metadata.authorName}`);
  console.log(`Caption:   ${KIMI_INPUT.caption}`);

  // STEP 1 — subject extraction
  console.log(sep("STEP 1 — subjectExtractor (gpt-4o-mini, ~$0.001)"));
  const t1 = Date.now();
  const subject = await extractSubject(KIMI_INPUT);
  console.log(`(took ${Date.now() - t1}ms)`);
  console.log(JSON.stringify(subject, null, 2));

  if (!subject) {
    console.log("\nExtractor returned null. Pipeline would skip enrichment and run verdict on post content alone.");
    return;
  }

  // STEP 2 — web research
  console.log(sep("STEP 2 — subjectResearcher (Responses API + web_search, ~$0.025)"));
  const t2 = Date.now();
  const research = await researchSubject(subject);
  console.log(`(took ${Date.now() - t2}ms)`);
  console.log(JSON.stringify(research, null, 2));

  // STEP 3 — full verdict pipeline
  console.log(sep("STEP 3 — generateVerdict (Pass 1 + Pass 2, gpt-4.1)"));
  const t3 = Date.now();
  const verdict = await generateVerdict({
    transcript: KIMI_INPUT.transcript,
    visualSummary: KIMI_INPUT.visualSummary,
    caption: KIMI_INPUT.caption,
    metadata: KIMI_INPUT.metadata,
    userContext: { role: "", goal: "" },
    platform: KIMI_INPUT.platform,
    sourceUrl: KIMI_INPUT.sourceUrl,
    subjectResearch: research,
  });
  console.log(`(took ${Date.now() - t3}ms)`);

  // STEP 4 — display in both surfaces
  console.log(sep("WHAT THE DASHBOARD SHOWS (full verdict — 📍 + 🪜 + 🌱/🍵)"));
  console.log(verdict);

  console.log(sep("WHAT TELEGRAM SHOWS (🪜 stripped at send-time)"));
  console.log(renderForTelegram(verdict));

  console.log(sep("STORED ON analyses.subject_research (JSONB)"));
  console.log(JSON.stringify(research, null, 2));
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
