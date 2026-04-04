import type { MyContext } from "../bot/context.js";
import { detectPlatform } from "./urlRouter.js";
import { ServiceError } from "./types.js";
import type { Platform } from "./types.js";
import * as users from "../db/users.js";
import * as credits from "../db/credits.js";
import * as analyses from "../db/analyses.js";
import * as scraper from "../services/scraper.js";
import * as storage from "../services/storage.js";
import * as transcriber from "../services/transcriber.js";
import * as frameExtractor from "../services/frameExtractor.js";
import * as visualAnalyzer from "../services/visualAnalyzer.js";
import * as verdictGenerator from "../services/verdictGenerator.js";
import { InlineKeyboard } from "grammy";

export async function runPipeline(
  ctx: MyContext,
  url: string,
): Promise<void> {
  const from = ctx.from!;
  const user = await users.getByTelegramId(from.id);
  if (!user) {
    await ctx.reply("Please /start first to create your account.");
    return;
  }

  if (!user.onboarded) {
    await ctx.reply(
      "Please complete onboarding first. Send /start to set up your profile.",
    );
    return;
  }

  // Check credits
  const balance = await credits.getBalance(user.id);
  if (balance <= 0) {
    await ctx.reply(
      "You're out of credits! Each analysis costs 1 credit.\n\n" +
        "Credit top-ups are coming soon. Stay tuned!",
    );
    return;
  }

  // Detect platform
  const platform = detectPlatform(url);
  if (platform === "unknown") {
    await ctx.reply(
      "I don't recognize that URL. Send me a link from Instagram, TikTok, X, or any article URL.",
    );
    return;
  }

  // Deduct credit upfront
  const deducted = await credits.deduct(user.id);
  if (!deducted) {
    await ctx.reply("You're out of credits!");
    return;
  }

  // Create analysis record
  const analysisId = await analyses.create({
    userId: user.id,
    sourceUrl: url,
    platform,
  });

  // Acknowledge receipt
  await ctx.reply("Got it. Analyzing now — back in about 30-60 seconds...");

  try {
    if (platform === "article") {
      await runArticlePipeline(ctx, user.id, analysisId, url);
    } else {
      await runVideoPipeline(ctx, user.id, analysisId, url, platform);
    }
  } catch (err) {
    console.error("Pipeline error:", err);
    // Refund credit on failure
    await credits.refund(user.id);

    const message =
      err instanceof ServiceError
        ? err.message
        : "An unexpected error occurred";

    await analyses.updateResult(analysisId, {
      status: "failed",
      errorMessage: message,
    });

    await ctx.reply(
      `Sorry, I couldn't analyze that link. Your credit has been refunded.\n\n` +
        `<i>Error: ${message}</i>`,
      { parse_mode: "HTML" },
    );
  } finally {
    await storage.cleanup(analysisId);
  }
}

async function runVideoPipeline(
  ctx: MyContext,
  userId: string,
  analysisId: string,
  url: string,
  platform: Platform,
): Promise<void> {
  // Step 1: Scrape metadata via yt-dlp
  await analyses.updateStatus(analysisId, "scraping");
  const scraped = await scraper.scrapeVideo(platform, url);

  // Step 2: Download video via yt-dlp
  const videoPath = await storage.downloadVideo(url, analysisId);

  // Step 3: Parallel transcription + frame extraction
  await analyses.updateStatus(analysisId, "transcribing");
  const [transcript, framePaths] = await Promise.all([
    transcriber.transcribe(videoPath),
    frameExtractor.extractFrames(videoPath),
  ]);

  // Step 4: Visual analysis
  await analyses.updateStatus(analysisId, "analyzing");
  const frameAnalyses = await visualAnalyzer.analyzeFrames(framePaths);
  const visualSummary = await visualAnalyzer.summarizeVisuals(frameAnalyses);

  // Step 5: Load user context
  const userContext = await users.getContext(userId);
  if (!userContext) {
    throw new ServiceError("NO_CONTEXT", "User has no context profile");
  }

  // Step 6: Generate verdict
  await analyses.updateStatus(analysisId, "generating");
  const verdict = await verdictGenerator.generateVerdict({
    transcript,
    visualSummary,
    caption: scraped.caption,
    metadata: scraped.metadata,
    userContext,
    platform,
    sourceUrl: url,
  });

  // Step 7: Save result
  await analyses.updateResult(analysisId, {
    transcript,
    frameDescriptions: frameAnalyses,
    visualSummary,
    caption: scraped.caption,
    metadata: scraped.metadata,
    verdict,
    status: "done",
  });

  // Step 8: Reply
  await sendVerdict(ctx, analysisId, verdict);
}

async function runArticlePipeline(
  ctx: MyContext,
  userId: string,
  analysisId: string,
  url: string,
): Promise<void> {
  // Step 1: Fetch article
  await analyses.updateStatus(analysisId, "scraping");
  const article = await scraper.scrapeArticle(url);

  // Step 2: Load user context
  const userContext = await users.getContext(userId);
  if (!userContext) {
    throw new ServiceError("NO_CONTEXT", "User has no context profile");
  }

  // Step 3: Generate verdict (no video processing needed)
  await analyses.updateStatus(analysisId, "generating");
  const verdict = await verdictGenerator.generateVerdict({
    transcript: null,
    visualSummary: "",
    caption: article.text.slice(0, 3000), // Limit article text
    metadata: { title: article.title, ...article.metadata },
    userContext,
    platform: "article",
    sourceUrl: url,
  });

  // Step 4: Save result
  await analyses.updateResult(analysisId, {
    transcript: null,
    caption: article.title,
    metadata: article.metadata,
    verdict,
    status: "done",
  });

  // Step 5: Reply
  await sendVerdict(ctx, analysisId, verdict);
}

async function sendVerdict(
  ctx: MyContext,
  analysisId: string,
  verdict: string,
): Promise<void> {
  const username = ctx.from?.username || ctx.from?.id || "user";

  const keyboard = new InlineKeyboard()
    .text("📚 Learn", `intent_learn_${analysisId}`)
    .text("⚡ Apply", `intent_apply_${analysisId}`)
    .text("🗑 Skip", `intent_ignore_${analysisId}`);

  const formatted =
    `${verdict}\n\n` +
    `📌 Saved → contextdrop.app/${username}`;

  await ctx.reply(formatted, {
    reply_markup: keyboard,
  });
}
