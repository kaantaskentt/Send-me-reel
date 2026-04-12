import type { MyContext } from "../bot/context.js";
import { detectPlatform } from "./urlRouter.js";
import { ServiceError } from "./types.js";
import type { Platform } from "./types.js";
import * as users from "../db/users.js";
import * as credits from "../db/credits.js";
import * as analyses from "../db/analyses.js";
import * as scraper from "../services/scraper.js";
import { scrapeWithApify, downloadFromCdn } from "../services/apifyScraper.js";
import * as storage from "../services/storage.js";
import * as transcriber from "../services/transcriber.js";
import * as frameExtractor from "../services/frameExtractor.js";
import * as visualAnalyzer from "../services/visualAnalyzer.js";
import * as verdictGenerator from "../services/verdictGenerator.js";
import { InlineKeyboard } from "grammy";
import { SignJWT } from "jose";
import { config } from "../config.js";

/**
 * Helper to reply in the right context — in groups, replies to the original message.
 */
function replyOpts(ctx: MyContext, replyToId?: number) {
  const isGroup =
    ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
  if (isGroup && replyToId) {
    return { reply_parameters: { message_id: replyToId } };
  }
  return {};
}

export async function runPipeline(
  ctx: MyContext,
  url: string,
  replyToMessageId?: number,
): Promise<void> {
  const from = ctx.from!;
  const user = await users.getByTelegramId(from.id);
  if (!user) {
    await ctx.reply(
      "Please /start first to create your account.",
      replyOpts(ctx, replyToMessageId),
    );
    return;
  }

  if (!user.onboarded) {
    await ctx.reply(
      "Please complete onboarding first. Send /start to set up your profile.",
      replyOpts(ctx, replyToMessageId),
    );
    return;
  }

  // Check credits
  const balance = await credits.getBalance(user.id);
  if (balance <= 0) {
    await ctx.reply(
      "You're out of credits! Each analysis costs 1 credit.\n\nCredit top-ups are coming soon.",
      replyOpts(ctx, replyToMessageId),
    );
    return;
  }

  // Detect platform
  const platform = detectPlatform(url);
  if (platform === "unknown") {
    await ctx.reply(
      "I don't recognize that URL. Send me a link from Instagram, TikTok, X, LinkedIn, YouTube, or any article URL.",
      replyOpts(ctx, replyToMessageId),
    );
    return;
  }

  // Deduct credit upfront
  const deducted = await credits.deduct(user.id);
  if (!deducted) {
    await ctx.reply("You're out of credits!", replyOpts(ctx, replyToMessageId));
    return;
  }

  // Create analysis record
  const analysisId = await analyses.create({
    userId: user.id,
    sourceUrl: url,
    platform,
  });

  // Acknowledge receipt
  await ctx.reply(
    "Received your content. Give me about 30 seconds — I'll break it down for you.",
    replyOpts(ctx, replyToMessageId),
  );

  try {
    if (platform === "article") {
      await runArticlePipeline(ctx, user.id, analysisId, url, replyToMessageId);
    } else {
      try {
        await runVideoPipeline(ctx, user.id, analysisId, url, platform, replyToMessageId);
      } catch (videoErr) {
        // Image posts, carousels, slideshows — fall back to article pipeline
        if (videoErr instanceof ServiceError && videoErr.code === "NOT_A_VIDEO") {
          console.log(`[pipeline] Not a video, falling back to article pipeline: ${url}`);
          await runArticlePipeline(ctx, user.id, analysisId, url, replyToMessageId);
        } else {
          throw videoErr;
        }
      }
    }
  } catch (err) {
    console.error("Pipeline error:", err);
    await credits.refund(user.id);

    const rawMessage =
      err instanceof ServiceError
        ? err.message
        : "An unexpected error occurred";

    // Clean error message for user — never show raw errors
    let userMessage: string;
    const errCode = err instanceof ServiceError ? err.code : "";
    if (errCode === "VIDEO_TOO_LONG") {
      userMessage = "This video is over 10 minutes — we currently support up to 10 minutes. Try a shorter clip.";
    } else if (errCode === "NO_CONTENT") {
      userMessage = "Couldn't extract any text or audio from this video. It might be music-only or visuals without speech.";
    } else if (rawMessage.includes("NOT_A_VIDEO") || rawMessage.includes("not a video")) {
      userMessage = "This link doesn't seem to contain a video. Try sending a Reel, TikTok, or video post.";
    } else if (rawMessage.includes("Both yt-dlp and") || rawMessage.includes("SCRAPE_FAILED")) {
      userMessage = "We tried multiple methods but couldn't access this content. The link might be private, expired, or the platform is blocking access. Try again in a minute.";
    } else if (rawMessage.includes("Failed to download") || rawMessage.includes("DOWNLOAD_FAILED")) {
      userMessage = "Couldn't download this video. Try again in a minute, or try a different link.";
    } else if (rawMessage.includes("Network") || rawMessage.includes("timeout")) {
      userMessage = "Network issue — couldn't reach the platform. Try again in a moment.";
    } else {
      userMessage = "Something went wrong analyzing this link. Your credit has been refunded.";
    }

    await analyses.updateResult(analysisId, {
      status: "failed",
      errorMessage: rawMessage,
    });

    await ctx.reply(
      `Sorry, I couldn't analyze that link. Your credit has been refunded.\n\n${userMessage}`,
      replyOpts(ctx, replyToMessageId),
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
  replyToMessageId?: number,
): Promise<void> {
  await analyses.updateStatus(analysisId, "scraping");

  // Step 1: Always use yt-dlp for metadata — it's always correct
  const scraped = await scraper.scrapeVideoWithFallback(platform, url);

  // Guard: reject videos longer than 10 minutes (cost + timeout risk)
  const duration = scraped.metadata?.duration as number | undefined;
  if (duration && duration > 600) {
    throw new ServiceError(
      "VIDEO_TOO_LONG",
      "This video is over 10 minutes. We currently support videos up to 10 minutes.",
      false,
    );
  }

  // Step 2: Download video — try yt-dlp, then Apify CDN via Vercel proxy
  let videoPath: string;
  try {
    videoPath = await storage.downloadVideo(url, analysisId);
  } catch (dlErr) {
    // yt-dlp download blocked — use Apify to get a CDN URL, download via Vercel proxy
    console.log(`[pipeline] yt-dlp download failed, using Apify + Vercel proxy...`);
    try {
      const apifyResult = await scrapeWithApify(platform, url);
      if (apifyResult.apifyVideoUrl) {
        videoPath = await downloadFromCdn(apifyResult.apifyVideoUrl, analysisId);
      } else {
        throw dlErr;
      }
    } catch (apifyErr) {
      console.error(`[pipeline] Apify fallback also failed:`, apifyErr instanceof Error ? apifyErr.message : apifyErr);
      throw new ServiceError(
        "DOWNLOAD_FAILED",
        "Could not download video. Both yt-dlp and Apify failed.",
        false,
      );
    }
  }

  await analyses.updateStatus(analysisId, "transcribing");
  const [transcript, framePaths] = await Promise.all([
    transcriber.transcribe(videoPath),
    frameExtractor.extractFrames(videoPath),
  ]);

  await analyses.updateStatus(analysisId, "analyzing");
  const frameAnalyses = await visualAnalyzer.analyzeFrames(framePaths);
  const visualSummary = await visualAnalyzer.summarizeVisuals(frameAnalyses);

  // Guard: if there's nothing to analyze, fail gracefully
  const hasContent = transcript?.trim() || scraped.caption?.trim() || visualSummary?.trim();
  if (!hasContent) {
    throw new ServiceError(
      "NO_CONTENT",
      "Couldn't extract any text, audio, or visual content from this video.",
      false,
    );
  }

  const userContext = await users.getContext(userId);
  if (!userContext) {
    throw new ServiceError("NO_CONTEXT", "User has no context profile");
  }

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

  await analyses.updateResult(analysisId, {
    transcript,
    frameDescriptions: frameAnalyses,
    visualSummary,
    caption: scraped.caption,
    metadata: scraped.metadata,
    verdict,
    status: "done",
  });

  await sendVerdict(ctx, analysisId, verdict, url, userId, replyToMessageId);
}

async function runArticlePipeline(
  ctx: MyContext,
  userId: string,
  analysisId: string,
  url: string,
  replyToMessageId?: number,
): Promise<void> {
  await analyses.updateStatus(analysisId, "scraping");
  const article = await scraper.scrapeArticle(url);

  const userContext = await users.getContext(userId);
  if (!userContext) {
    throw new ServiceError("NO_CONTEXT", "User has no context profile");
  }

  await analyses.updateStatus(analysisId, "generating");
  const verdict = await verdictGenerator.generateVerdict({
    transcript: null,
    visualSummary: "",
    caption: article.text.slice(0, 3000),
    metadata: { title: article.title, ...article.metadata },
    userContext,
    platform: "article",
    sourceUrl: url,
  });

  await analyses.updateResult(analysisId, {
    transcript: null,
    caption: article.title,
    metadata: article.metadata,
    verdict,
    status: "done",
  });

  await sendVerdict(ctx, analysisId, verdict, url, userId, replyToMessageId);
}

async function sendVerdict(
  ctx: MyContext,
  analysisId: string,
  verdict: string,
  sourceUrl: string,
  userId: string,
  replyToMessageId?: number,
): Promise<void> {
  const from = ctx.from!;
  const telegramId = from.id;

  // Build inline keyboard: View Original + Dashboard + Save to Notion
  const keyboard = new InlineKeyboard()
    .url("👁 View Original", sourceUrl);

  // Add "Dashboard" URL button with a signed JWT link
  if (config.jwtSecret) {
    const secret = new TextEncoder().encode(config.jwtSecret);
    const token = await new SignJWT({
      sub: userId,
      username: from.username || String(telegramId),
      tid: telegramId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .setIssuedAt()
      .sign(secret);

    keyboard.url("📊 Dashboard", `${config.appUrl}/auth?token=${token}`);
  }

  keyboard.text("📒 Save to Notion", `action_notion_${analysisId}_${telegramId}`);

  await ctx.reply(verdict, {
    reply_markup: keyboard,
    ...replyOpts(ctx, replyToMessageId),
  });
}
