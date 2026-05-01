/**
 * Apr 26 — one-off live pipeline run.
 *
 * Takes a single URL, runs the FULL new pipeline end-to-end (scrape →
 * download → transcribe → vision → subject extraction → web research →
 * verdict), prints every intermediate. No DB writes.
 *
 * Usage: npx tsx scripts/analyze-one.ts "<url>"
 * Env: OPENAI_API_KEY, APIFY_API_TOKEN, SUPABASE_URL/KEY (already in .env)
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { detectPlatform } from "../src/pipeline/urlRouter.js";
import * as scraper from "../src/services/scraper.js";
import * as storage from "../src/services/storage.js";
import * as transcriber from "../src/services/transcriber.js";
import * as frameExtractor from "../src/services/frameExtractor.js";
import * as visualAnalyzer from "../src/services/visualAnalyzer.js";
import { extractSubject } from "../src/services/subjectExtractor.js";
import { researchSubject } from "../src/services/subjectResearcher.js";
import { generateVerdict, renderForTelegram } from "../src/services/verdictGenerator.js";
import { classifyContent } from "../src/services/contentClassifier.js";

const url = process.argv[2];
if (!url) {
  console.error("Usage: npx tsx scripts/analyze-one.ts \"<url>\"");
  process.exit(1);
}

const sep = (l: string) => `\n${"─".repeat(70)}\n${l}\n${"─".repeat(70)}`;

async function main() {
  const platform = detectPlatform(url);
  console.log(sep(`PLATFORM: ${platform} · URL: ${url}`));

  if (platform === "unknown") {
    console.error("Unknown platform — pipeline would refuse this in prod.");
    return;
  }

  const tmpId = `oneoff-${randomUUID().slice(0, 8)}`;

  let caption = "";
  let transcript: string | null = null;
  let visualSummary = "";
  let metadata: Record<string, unknown> = {};

  try {
    if (platform === "article") {
      console.log(sep("STEP 1 — scrapeArticle"));
      const article = await scraper.scrapeArticle(url);
      console.log(`Title:    ${article.title}`);
      console.log(`Text:     ${article.text.slice(0, 400)}…`);
      caption = article.text.slice(0, 3000);
      metadata = { title: article.title, ...article.metadata };
    } else {
      console.log(sep("STEP 1 — scrapeVideoWithFallback"));
      let isArticleFallback = false;
      let scraped: Awaited<ReturnType<typeof scraper.scrapeVideoWithFallback>> | undefined;
      try {
        scraped = await scraper.scrapeVideoWithFallback(platform, url);
      } catch (err: unknown) {
        if ((err as { code?: string }).code === "NOT_A_VIDEO") {
          console.log("[fallback] Image/carousel — running article pipeline instead");
          isArticleFallback = true;
          const article = await scraper.scrapeArticle(url);
          console.log(`Title:    ${article.title}`);
          console.log(`Text:     ${article.text.slice(0, 400)}…`);
          caption = article.text.slice(0, 3000);
          metadata = { title: article.title, ...article.metadata };
        } else {
          throw err;
        }
      }
      if (!isArticleFallback && scraped) {
        console.log(`Caption:  ${scraped.caption?.slice(0, 200) ?? "(none)"}…`);
        console.log(`Author:   ${scraped.metadata.authorName ?? scraped.metadata.authorUsername ?? "(unknown)"}`);
        caption = scraped.caption;
        metadata = scraped.metadata;

        console.log(sep("STEP 2 — download + transcribe + frames in parallel"));
        const apifyUrl = (scraped.metadata.cdnVideoUrl as string | undefined) ?? undefined;
        const videoPath = await storage.downloadWithFallback(url, tmpId, apifyUrl);
        const [t, frames] = await Promise.all([
          transcriber.transcribe(videoPath).catch((err) => {
            console.error("[transcriber] failed:", err instanceof Error ? err.message : err);
            return "";
          }),
          frameExtractor.extractFrames(videoPath).catch((err) => {
            console.error("[frames] failed:", err instanceof Error ? err.message : err);
            return [] as string[];
          }),
        ]);
        transcript = t;
        console.log(`Transcript: ${transcript ? transcript.slice(0, 240) + "…" : "(empty)"}`);

        console.log(sep("STEP 3 — visual analysis"));
        const frameAnalyses = await visualAnalyzer.analyzeFrames(frames);
        visualSummary = await visualAnalyzer.summarizeVisuals(frameAnalyses);
        console.log(`Visual summary: ${visualSummary.slice(0, 320)}…`);
      }
    }
  } finally {
    if (platform !== "article") {
      await storage.cleanup(tmpId).catch(() => {});
    }
  }

  // STEP 4 — classify content
  console.log(sep("STEP 4 — contentClassifier"));
  const contentType = await classifyContent({ transcript, caption, visualSummary, platform, sourceUrl: url });
  console.log(`category: ${contentType.category}  lane: ${contentType.action_lane}  conf: ${contentType.confidence.toFixed(2)}  needs_search: ${contentType.needs_search}`);

  // STEP 5 — subject extraction
  console.log(sep("STEP 5 — subjectExtractor"));
  const subject = await extractSubject({
    caption,
    transcript,
    visualSummary,
    platform,
    sourceUrl: url,
    metadata,
  });
  console.log(JSON.stringify(subject, null, 2));

  // STEP 6 — web research (gated on needs_search)
  let research = null;
  if (subject && contentType.needs_search) {
    console.log(sep("STEP 6 — subjectResearcher (web_search)"));
    research = await researchSubject(subject);
    console.log(JSON.stringify(research, null, 2));
  } else {
    console.log("\n(skipping research — needs_search=false or no subject)");
  }

  // STEP 7 — full verdict
  console.log(sep("STEP 7 — generateVerdict"));
  const verdict = await generateVerdict({
    transcript,
    visualSummary,
    caption,
    metadata,
    userContext: { role: "", goal: "" },
    platform,
    sourceUrl: url,
    subjectResearch: research,
    contentType,
  });

  console.log(sep("=== WHAT THE DASHBOARD SHOWS ==="));
  console.log(verdict);

  console.log(sep("=== WHAT TELEGRAM SHOWS ==="));
  console.log(renderForTelegram(verdict));

  const hits = scanForBannedWords(verdict);
  console.log(sep("=== BANNED-WORD CHECK ==="));
  if (hits.length === 0) {
    console.log("✅ None found.");
  } else {
    console.log(`⚠️  ${hits.length} hit(s): ${hits.join(", ")}`);
  }
}

const BANNED_TERMS = [
  // AI-tell single words (from HUMANIZER_RULES + per-prompt BANNED WORDS)
  "actually", "additionally", "crucial", "delve", "emphasize", "enhance",
  "foster", "garner", "highlight", "intricate", "pivotal", "showcase",
  "tapestry", "testament", "underscore", "valuable", "vibrant", "profound",
  "groundbreaking", "renowned", "powerful", "robust", "exciting", "fascinating",
  "incredible", "innovative", "cutting-edge", "comprehensive", "leverage",
  "optimize", "unlock", "elevate", "supercharge", "actionable", "revolutionary",
  "ecosystem", "streamline", "workflow", "10x",
  // AI-tell phrases
  "key takeaway", "pro tip", "deep dive", "bottom line", "valuable insights",
  "let's explore", "let's dive", "in conclusion", "game-changer",
  "stands as", "serves as", "plays a vital", "plays a crucial",
  "underscores the importance", "in order to",
];

function scanForBannedWords(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_TERMS.filter((term) => lower.includes(term));
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
