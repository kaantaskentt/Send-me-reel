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
import * as qualityGate from "../services/qualityGate.js";
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
  userNote?: string,
): Promise<void> {
  const from = ctx.from!;
  const user = await users.getByTelegramId(from.id);
  if (!user) {
    await ctx.reply(
      "Start with /start to set up your account.",
      replyOpts(ctx, replyToMessageId),
    );
    return;
  }

  if (!user.onboarded) {
    await ctx.reply(
      "Finish setup first — tap /start.",
      replyOpts(ctx, replyToMessageId),
    );
    return;
  }

  // Check credits
  const balance = await credits.getBalance(user.id);
  if (balance <= 0) {
    await ctx.reply(
      "You're out for now. Top-ups soon. /dashboard to revisit what's saved.",
      replyOpts(ctx, replyToMessageId),
    );
    return;
  }

  // Detect platform
  const platform = detectPlatform(url);
  if (platform === "unknown") {
    await ctx.reply(
      "Don't recognize that one. I do Instagram, TikTok, X, LinkedIn, YouTube, articles.",
      replyOpts(ctx, replyToMessageId),
    );
    return;
  }

  // Deduct credit upfront
  const deducted = await credits.deduct(user.id);
  if (!deducted) {
    await ctx.reply("You're out for now.", replyOpts(ctx, replyToMessageId));
    return;
  }

  // Create analysis record — if this fails, refund + tell user, never silently lose them
  let analysisId: string;
  try {
    analysisId = await analyses.create({
      userId: user.id,
      sourceUrl: url,
      platform,
    });
  } catch (createErr) {
    console.error("[pipeline] Failed to create analysis record:", createErr);
    credits.refund(user.id).catch((refundErr) =>
      console.error("[pipeline] CRITICAL: refund failed after create failure for user", user.id, refundErr),
    );
    await ctx.reply(
      "Something broke on our end. Credit's back. Try again in a sec.",
      replyOpts(ctx, replyToMessageId),
    ).catch((replyErr) => console.error("[pipeline] Failed to send error reply:", replyErr));
    return;
  }

  // Acknowledge receipt
  await ctx.reply(
    "On it. Give me 30 seconds.",
    replyOpts(ctx, replyToMessageId),
  ).catch((replyErr) => {
    // If we can't even acknowledge, log but keep going — the pipeline will still try to deliver a verdict
    console.error("[pipeline] Failed to send 'On it' ack:", replyErr);
  });

  // 45s progress ping — reassures user they're not forgotten on slow videos
  const progressTimer = setTimeout(() => {
    ctx.reply("Still working. Shouldn't be long.", replyOpts(ctx, replyToMessageId))
      .catch((err) => console.error("[pipeline] Failed to send progress ping:", err));
  }, 45_000);
  if (typeof progressTimer.unref === "function") progressTimer.unref();

  // Hard timeout at 3 min. Anything beyond this → refund + clear message.
  const PIPELINE_TIMEOUT_MS = 180_000;

  const pipelineWork = async () => {
    if (platform === "article") {
      await runArticlePipeline(ctx, user.id, analysisId, url, replyToMessageId, userNote);
    } else {
      try {
        await runVideoPipeline(ctx, user.id, analysisId, url, platform, replyToMessageId, userNote);
      } catch (videoErr) {
        const errCode = videoErr instanceof ServiceError ? videoErr.code : "";
        const fallbackCodes = ["NOT_A_VIDEO", "DOWNLOAD_FAILED", "SCRAPE_FAILED", "SCRAPE_MISMATCH", "APIFY_NO_MATCH"];

        if (fallbackCodes.includes(errCode)) {
          console.log(`[pipeline] Video failed (${errCode}), falling back to article pipeline: ${url}`);
          await runArticlePipeline(ctx, user.id, analysisId, url, replyToMessageId, userNote);
        } else {
          throw videoErr;
        }
      }
    }
  };

  try {
    await Promise.race([
      pipelineWork(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new ServiceError("PIPELINE_TIMEOUT", "Analysis took longer than 3 minutes", false)),
          PIPELINE_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch (err) {
    console.error("Pipeline error:", err);
    // Fire-and-forget refund — never block the error reply if the DB is flaky
    credits.refund(user.id).catch((refundErr) =>
      console.error("[pipeline] CRITICAL: refund failed for user", user.id, refundErr),
    );

    const rawMessage =
      err instanceof ServiceError
        ? err.message
        : "An unexpected error occurred";

    const errCode = err instanceof ServiceError ? err.code : "";
    let userMessage: string;
    if (errCode === "NO_CONTENT") {
      userMessage = rawMessage;
    } else if (errCode === "PIPELINE_TIMEOUT") {
      userMessage = "Took longer than usual. Refunded. Try again in a sec.";
    } else if (errCode === "VIDEO_TOO_LONG") {
      userMessage = "Too long. I cap at 10 minutes. Try a shorter clip.";
    } else if (errCode === "SCRAPE_MISMATCH" || errCode === "APIFY_NO_MATCH") {
      userMessage = "Couldn't reliably get that link. Might be private, deleted, or rate-limited. Try again in a minute.";
    } else if (rawMessage.includes("Both yt-dlp and") || rawMessage.includes("SCRAPE_FAILED")) {
      userMessage = "Couldn't access this one. Might be private or rate-limited. Try again in a minute.";
    } else if (rawMessage.includes("Failed to download") || rawMessage.includes("DOWNLOAD_FAILED")) {
      userMessage = "Couldn't download the video. Try again in a minute.";
    } else if (rawMessage.includes("Network") || rawMessage.includes("timeout")) {
      userMessage = "Network issue. Couldn't reach the platform. Try again in a sec.";
    } else {
      userMessage = "Something broke analyzing this. Try again in a sec.";
    }

    // DB write is best-effort — don't let it swallow the user reply
    analyses.updateResult(analysisId, {
      status: "failed",
      errorMessage: rawMessage,
    }).catch((dbErr) => console.error("[pipeline] Failed to record failure in DB:", dbErr));

    await ctx.reply(
      `Couldn't get that one. Credit's back.\n\n${userMessage}`,
      replyOpts(ctx, replyToMessageId),
    ).catch((replyErr) => console.error("[pipeline] Failed to send error reply:", replyErr));
  } finally {
    clearTimeout(progressTimer);
    try {
      await storage.cleanup(analysisId);
    } catch (cleanupErr) {
      console.error("[pipeline] Cleanup failed (non-blocking):", cleanupErr);
    }
  }
}

/**
 * Grammy-free video pipeline — processes video and writes results to DB.
 * Used by both the Telegram bot wrapper and the web queue worker.
 */
export async function executeVideoPipeline(
  userId: string,
  analysisId: string,
  url: string,
  platform: Platform,
  userNote?: string,
): Promise<string> {
  await analyses.updateStatus(analysisId, "scraping");

  // Step 1: Get metadata — yt-dlp first, Apify fallback
  const scraped = await scraper.scrapeVideoWithFallback(platform, url);

  // Save the Apify video URL from metadata scrape so we don't call Apify twice
  const apifyVideoUrl = (scraped as any).apifyVideoUrl as string | undefined;

  // Canonical integrity log — grep for [integrity] to spot wrong-content bugs
  const requestedShortcode = url.match(/\/(reel|p|video)\/([A-Za-z0-9_-]+)/)?.[2] || "n/a";
  const scrapedId = String(scraped.metadata?.id || "unknown");
  const source = String(scraped.metadata?.source || "yt-dlp");
  console.log(
    `[integrity] analysisId=${analysisId} platform=${platform} source=${source} ` +
    `requested=${requestedShortcode} scraped_id=${scrapedId} author=${scraped.authorUsername || "n/a"} ` +
    `caption_len=${scraped.caption?.length || 0}`,
  );

  // Guard: reject videos longer than 10 minutes (cost + timeout risk)
  const duration = scraped.metadata?.duration as number | undefined;
  if (duration && duration > 600) {
    throw new ServiceError(
      "VIDEO_TOO_LONG",
      "This video is over 10 minutes. We currently support videos up to 10 minutes.",
      false,
    );
  }

  // Step 2: Download video — yt-dlp first, then Apify CDN (reuse URL from step 1)
  let videoPath: string;
  try {
    videoPath = await storage.downloadVideo(url, analysisId);
  } catch (dlErr) {
    // yt-dlp download blocked — try the Apify CDN URL we already have
    if (apifyVideoUrl) {
      console.log(`[pipeline] yt-dlp download failed, using saved Apify CDN URL...`);
      try {
        videoPath = await downloadFromCdn(apifyVideoUrl, analysisId);
      } catch (cdnErr) {
        console.error(`[pipeline] Apify CDN download also failed:`, cdnErr instanceof Error ? cdnErr.message : cdnErr);
        throw new ServiceError(
          "DOWNLOAD_FAILED",
          "Could not download video. Both yt-dlp and Apify CDN failed.",
          false,
        );
      }
    } else {
      // No Apify video URL — this is likely an image post. Fall back to article pipeline.
      console.log(`[pipeline] No video URL available (image post?), falling back to article pipeline`);
      throw new ServiceError("NOT_A_VIDEO", "No video URL available from any source", false);
    }
  }

  await analyses.updateStatus(analysisId, "transcribing");

  // Wrap transcription and frame extraction so one failing doesn't kill the other
  const [transcript, framePaths] = await Promise.all([
    transcriber.transcribe(videoPath).catch((err) => {
      console.error(`[pipeline] Transcription failed (continuing with empty):`, err instanceof Error ? err.message : err);
      return "";
    }),
    frameExtractor.extractFrames(videoPath).catch((err) => {
      console.error(`[pipeline] Frame extraction failed (continuing with empty):`, err instanceof Error ? err.message : err);
      return [] as string[];
    }),
  ]);

  await analyses.updateStatus(analysisId, "analyzing");
  const frameAnalyses = await visualAnalyzer.analyzeFrames(framePaths);
  const visualSummary = await visualAnalyzer.summarizeVisuals(frameAnalyses);

  // Quality gate — AI decides if content is real and how to route it
  const decision = await qualityGate.evaluateContent({
    transcript,
    caption: scraped.caption,
    visualSummary,
    platform,
    url,
  });

  if (!decision.proceed) {
    if (decision.strategy === "article") {
      throw new ServiceError("NOT_A_VIDEO", decision.reason, false);
    }
    throw new ServiceError("NO_CONTENT", decision.reason, false);
  }

  // Phase 4: stance is the only signal Pass 2 uses for tone calibration.
  // userContext is fetched for back-compat with the type but Phase 1 already
  // removed it from the verdict prompt. Both can be NULL for new users —
  // the verdict pipeline handles that gracefully.
  const [userContext, stance] = await Promise.all([
    users.getContext(userId),
    users.getStance(userId),
  ]);

  await analyses.updateStatus(analysisId, "generating");
  const verdict = await verdictGenerator.generateVerdict({
    transcript,
    visualSummary,
    caption: scraped.caption,
    metadata: scraped.metadata,
    userContext: userContext ?? { role: "", goal: "" },
    platform,
    sourceUrl: url,
    userNote,
    stance: stance ?? undefined,
  });

  await analyses.updateResult(analysisId, {
    transcript,
    frameDescriptions: frameAnalyses,
    visualSummary,
    caption: scraped.caption,
    metadata: userNote ? { ...scraped.metadata, userNote } : scraped.metadata,
    verdict,
    status: "done",
  });

  return verdict;
}

/**
 * Grammy-free article pipeline — processes article and writes results to DB.
 * Used by both the Telegram bot wrapper and the web queue worker.
 */
export async function executeArticlePipeline(
  userId: string,
  analysisId: string,
  url: string,
  userNote?: string,
): Promise<string> {
  await analyses.updateStatus(analysisId, "scraping");
  const article = await scraper.scrapeArticle(url);

  // Quality gate — AI decides if article content is real
  const decision = await qualityGate.evaluateContent({
    transcript: null,
    caption: article.text.slice(0, 500),
    visualSummary: null,
    platform: "article",
    url,
  });

  if (!decision.proceed) {
    throw new ServiceError("NO_CONTENT", decision.reason, false);
  }

  // Phase 4: stance + back-compat userContext. Both can be NULL.
  const [userContext, stance] = await Promise.all([
    users.getContext(userId),
    users.getStance(userId),
  ]);

  await analyses.updateStatus(analysisId, "generating");
  const verdict = await verdictGenerator.generateVerdict({
    transcript: null,
    visualSummary: "",
    caption: article.text.slice(0, 3000),
    metadata: { title: article.title, ...article.metadata },
    userContext: userContext ?? { role: "", goal: "" },
    platform: "article",
    sourceUrl: url,
    userNote,
    stance: stance ?? undefined,
  });

  await analyses.updateResult(analysisId, {
    transcript: null,
    caption: article.title,
    metadata: userNote ? { ...article.metadata, userNote } : article.metadata,
    verdict,
    status: "done",
  });

  return verdict;
}

/**
 * Grammy-free pipeline dispatcher — routes to video or article pipeline with fallback.
 * Used by the web queue worker. Handles credits refund on failure.
 */
export async function executePipeline(
  userId: string,
  analysisId: string,
  url: string,
  platform: Platform,
  userNote?: string,
): Promise<void> {
  try {
    if (platform === "article") {
      await executeArticlePipeline(userId, analysisId, url, userNote);
    } else {
      try {
        await executeVideoPipeline(userId, analysisId, url, platform, userNote);
      } catch (videoErr) {
        const errCode = videoErr instanceof ServiceError ? videoErr.code : "";
        const fallbackCodes = ["NOT_A_VIDEO", "DOWNLOAD_FAILED", "SCRAPE_FAILED", "SCRAPE_MISMATCH", "APIFY_NO_MATCH"];
        if (fallbackCodes.includes(errCode)) {
          console.log(`[pipeline] Video failed (${errCode}), falling back to article pipeline: ${url}`);
          await executeArticlePipeline(userId, analysisId, url, userNote);
        } else {
          throw videoErr;
        }
      }
    }
  } catch (err) {
    console.error("[pipeline] executePipeline error:", err);
    await credits.refund(userId);

    const rawMessage =
      err instanceof ServiceError ? err.message : "An unexpected error occurred";

    await analyses.updateResult(analysisId, {
      status: "failed",
      errorMessage: rawMessage,
    });

    throw err;
  } finally {
    await storage.cleanup(analysisId);
  }
}

// Telegram-specific wrappers that delegate to the Grammy-free core

async function runVideoPipeline(
  ctx: MyContext,
  userId: string,
  analysisId: string,
  url: string,
  platform: Platform,
  replyToMessageId?: number,
  userNote?: string,
): Promise<void> {
  const verdict = await executeVideoPipeline(userId, analysisId, url, platform, userNote);
  await sendVerdict(ctx, analysisId, verdict, url, userId, replyToMessageId);
}

async function runArticlePipeline(
  ctx: MyContext,
  userId: string,
  analysisId: string,
  url: string,
  replyToMessageId?: number,
  userNote?: string,
): Promise<void> {
  const verdict = await executeArticlePipeline(userId, analysisId, url, userNote);
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

  // Phase 2 keyboard: two buttons, one row. Action axis only.
  //   📍 Open dashboard — bridge to the action archive
  //   🍵 Just watched it — explicit "no homework" tap, marks set_aside
  // The Original URL is already in the message text and Telegram auto-links it.
  // Save-to-Notion moves to auto-push on "I tried it" (Phase 5).
  const keyboard = new InlineKeyboard();

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

    keyboard.url("📍 Open in dashboard", `${config.appUrl}/auth?token=${token}`);
  }

  keyboard.text("🍵 Just watched it", `action_setaside_${analysisId}_${telegramId}`);

  // Telegram render: strip the 🪜 "go further" block — that line lives on the
  // dashboard only. Storage already has the full verdict; we only trim at send.
  const telegramVerdict = verdictGenerator.renderForTelegram(verdict);

  await ctx.reply(telegramVerdict, {
    reply_markup: keyboard,
    ...replyOpts(ctx, replyToMessageId),
  });
}
