import type { MyContext } from "../bot/context.js";
import { detectPlatform } from "./urlRouter.js";
import { ServiceError } from "./types.js";
import type { Platform } from "./types.js";
import * as users from "../db/users.js";
import * as credits from "../db/credits.js";
import * as analyses from "../db/analyses.js";
import * as scraper from "../services/scraper.js";
import { downloadFromCdn, scrapeWithApify } from "../services/apifyScraper.js";
import * as storage from "../services/storage.js";
import * as transcriber from "../services/transcriber.js";
import * as frameExtractor from "../services/frameExtractor.js";
import * as visualAnalyzer from "../services/visualAnalyzer.js";
import * as verdictGenerator from "../services/verdictGenerator.js";
import * as qualityGate from "../services/qualityGate.js";
import { classifyContent } from "../services/contentClassifier.js";
import { extractSubject } from "../services/subjectExtractor.js";
import { researchSubject, type SubjectResearch } from "../services/subjectResearcher.js";
import { InlineKeyboard } from "grammy";
import { SignJWT } from "jose";
import { config } from "../config.js";

// Per-step cost estimates (USD). Real data accumulates in analyses.cost_usd.
const COST_APIFY_SCRAPE     = 0.003;
const COST_WHISPER_PER_MIN  = 0.006;
const COST_VISION_PER_FRAME = 0.00015;
const COST_VISUAL_SUMMARY   = 0.00005;
const COST_CLASSIFIER       = 0.00008;
const COST_SUBJECT_RESEARCH = 0.001;
const COST_VERDICT          = 0.003;

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

  // Reserve a credit and insert the analysis in one transaction.
  let analysisId: string;
  try {
    analysisId = await analyses.create({
      userId: user.id,
      sourceUrl: url,
      platform,
      userNote,
    });
  } catch (createErr) {
    console.error("[pipeline] Failed to create analysis record:", createErr);
    await ctx.reply(
      createErr instanceof ServiceError && createErr.code === "INSUFFICIENT_CREDITS"
        ? "You're out for now."
        : "Analysis submission is temporarily unavailable. Please try again later.",
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
  const controller = new AbortController();
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

  const pipelineWork = async () => {
    if (platform === "article") {
      await runArticlePipeline(ctx, user.id, analysisId, url, replyToMessageId, userNote, controller.signal);
    } else {
      try {
        await runVideoPipeline(ctx, user.id, analysisId, url, platform, replyToMessageId, userNote, controller.signal);
      } catch (videoErr) {
        const errCode = videoErr instanceof ServiceError ? videoErr.code : "";
        // Only fall back to article for NOT_A_VIDEO (image posts with captions).
        // Scraping failures on social media URLs also fail via Jina and produce junk verdicts.
        if (errCode === "NOT_A_VIDEO") {
          console.log(`[pipeline] Image post (NOT_A_VIDEO), falling back to article pipeline: ${url}`);
          await runArticlePipeline(ctx, user.id, analysisId, url, replyToMessageId, userNote, controller.signal);
        } else {
          throw videoErr;
        }
      }
    }
  };

  try {
    await Promise.race([
      // A timed-out scraper may still finish its network request. Cleanup belongs to
      // the work promise so it cannot race with a download recreating the temp files.
      pipelineWork().finally(() => storage.cleanup(analysisId)),
      new Promise<never>((_, reject) => {
        timeoutTimer = setTimeout(() => {
          const error = new ServiceError("PIPELINE_TIMEOUT", "Analysis took longer than 3 minutes", false);
          controller.abort(error);
          reject(error);
        }, PIPELINE_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    console.error("Pipeline error:", err);
    const rawMessage =
      err instanceof ServiceError
        ? err.message
        : "An unexpected error occurred";

    const errCode = err instanceof ServiceError ? err.code : "";
    let userMessage: string;
    if (errCode === "NO_CONTENT") {
      userMessage = rawMessage;
    } else if (errCode === "PIPELINE_TIMEOUT") {
      userMessage = "Took longer than usual. Try again in a sec.";
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

    let refundConfirmed = false;
    try {
      await analyses.updateResult(analysisId, { status: "failed", errorMessage: rawMessage });
      await credits.refundAnalysis(analysisId);
      refundConfirmed = true;
    } catch (dbError) {
      console.error("[pipeline] Failure/refund persistence requires recovery:", dbError);
    }

    await ctx.reply(
      `Couldn't get that one. ${refundConfirmed ? "Credit's back." : "The credit refund could not be confirmed yet."}\n\n${userMessage}`,
      replyOpts(ctx, replyToMessageId),
    ).catch((replyErr) => console.error("[pipeline] Failed to send error reply:", replyErr));
  } finally {
    clearTimeout(progressTimer);
    clearTimeout(timeoutTimer);
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
  signal?: AbortSignal,
): Promise<string> {
  signal?.throwIfAborted();
  await analyses.updateStatus(analysisId, "scraping");

  let costUsd = COST_APIFY_SCRAPE;

  // Step 1: Get metadata — yt-dlp first, Apify fallback
  const scraped = await scraper.scrapeVideoWithFallback(platform, url);
  signal?.throwIfAborted();

  // Save the Apify video URL from metadata scrape so we don't call Apify twice
  let apifyVideoUrl = (scraped as any).apifyVideoUrl as string | undefined;
  let downloadProvider = "yt-dlp";

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
  const reportedDuration = Number(scraped.metadata?.duration);
  if (Number.isFinite(reportedDuration) && reportedDuration > frameExtractor.MAX_VIDEO_SECONDS) {
    frameExtractor.validateVideoDuration(reportedDuration);
  }

  // Step 2: Download video — yt-dlp first, then Apify CDN (reuse URL from step 1)
  let videoPath: string;
  try {
    videoPath = await storage.downloadVideo(url, analysisId);
  } catch (dlErr) {
    signal?.throwIfAborted();
    // Metadata can be public while the media CDN blocks yt-dlp. Give the alternate
    // provider a chance in this case too, while retaining the original content identity.
    if (!apifyVideoUrl && source === "yt-dlp" && (platform === "instagram" || platform === "tiktok" || platform === "x")) {
      try {
        const fallback = await scrapeWithApify(platform, url);
        signal?.throwIfAborted();
        scraper.verifyScrapedContent(platform, url, fallback);
        if ((platform === "tiktok" || platform === "x") && String(fallback.metadata.id) !== scrapedId) {
          throw new ServiceError("SCRAPE_MISMATCH", "The download fallback returned a different video", false);
        }
        apifyVideoUrl = fallback.apifyVideoUrl;
      } catch (fallbackError) {
        signal?.throwIfAborted();
        if (fallbackError instanceof ServiceError && ["SCRAPE_MISMATCH", "APIFY_NO_MATCH"].includes(fallbackError.code)) throw fallbackError;
        console.error("[pipeline] Alternate media lookup failed:", fallbackError instanceof Error ? fallbackError.message : fallbackError);
      }
    }
    // yt-dlp download blocked — try the Apify CDN URL we already have
    if (apifyVideoUrl) {
      console.log(`[pipeline] yt-dlp download failed, using saved Apify CDN URL...`);
      try {
        videoPath = await downloadFromCdn(apifyVideoUrl, analysisId);
        downloadProvider = "apify-cdn";
      } catch (cdnErr) {
        console.error(`[pipeline] Apify CDN download also failed:`, cdnErr instanceof Error ? cdnErr.message : cdnErr);
        throw new ServiceError(
          "DOWNLOAD_FAILED",
          "Could not download video. Both yt-dlp and Apify CDN failed.",
          false,
        );
      }
    } else {
      // Distinguish two cases:
      // 1. source=apify, no videoUrl → genuine image post (Apify scraped it, no video present)
      //    → NOT_A_VIDEO triggers article pipeline (caption analysis)
      // 2. source=yt-dlp, download failed → IS a video but undownloadable from Railway IP
      //    → DOWNLOAD_FAILED hard-fails with refund; do not fall back to Jina junk
      const scrapeSource = String(scraped.metadata?.source ?? "yt-dlp");
      if (scrapeSource === "apify") {
        console.log(`[pipeline] Apify returned no video URL — image post, falling back to article pipeline`);
        throw new ServiceError("NOT_A_VIDEO", "No video URL available from Apify (image post)", false);
      } else {
        console.log(`[pipeline] yt-dlp metadata succeeded but download failed with no CDN fallback`);
        throw new ServiceError(
          "DOWNLOAD_FAILED",
          "Could not download video — likely blocked by Instagram CDN. Try again in a minute.",
          false,
        );
      }
    }
  }

  // Scraper metadata can omit or misreport duration. Enforce the limit on the media.
  signal?.throwIfAborted();
  const duration = await frameExtractor.getVideoDuration(videoPath);
  frameExtractor.validateVideoDuration(duration);
  signal?.throwIfAborted();
  await analyses.updateStatus(analysisId, "transcribing");

  const evidenceWarnings: string[] = [];
  let transcriptionFailed = false;
  let frameExtractionFailed = false;

  // Wrap transcription and frame extraction so one failing doesn't kill the other
  const [transcript, frameResult] = await Promise.all([
    transcriber.transcribe(videoPath, signal).catch((err) => {
      console.error(`[pipeline] Transcription failed (continuing with empty):`, err instanceof Error ? err.message : err);
      transcriptionFailed = true;
      evidenceWarnings.push("Audio transcription failed. Spoken instructions are unavailable.");
      return "";
    }),
    frameExtractor.extractFrames(videoPath, duration).catch((err) => {
      console.error(`[pipeline] Frame extraction failed (continuing with empty):`, err instanceof Error ? err.message : err);
      frameExtractionFailed = true;
      evidenceWarnings.push("Video frames could not be extracted. On-screen instructions are unavailable.");
      return { paths: [] as string[], timestampsSec: [] as number[], intervalUsed: 0, durationSec: duration, samplingLimited: false };
    }),
  ]);
  signal?.throwIfAborted();

  if (duration) costUsd += COST_WHISPER_PER_MIN * (duration / 60);

  await analyses.updateStatus(analysisId, "analyzing");
  const visualResult = await visualAnalyzer.analyzeFramesDetailed(frameResult.paths, frameResult.intervalUsed, frameResult.timestampsSec, signal);
  signal?.throwIfAborted();
  const frameAnalyses = visualResult.frames;
  evidenceWarnings.push(...visualResult.warnings);
  if (!transcript.trim() && !transcriptionFailed) evidenceWarnings.push("No speech transcript was extracted.");
  if (transcript.trim()) evidenceWarnings.push("The transcript has no word or segment timestamps; spoken steps cannot yet be aligned precisely with frames.");
  if (frameResult.paths.length) evidenceWarnings.push(`Visual evidence uses sampled frames approximately every ${frameResult.intervalUsed.toFixed(2)} seconds. Actions between samples may be missing.`);
  if (frameResult.samplingLimited) evidenceWarnings.push(`Sampling was reduced to stay within the ${frameExtractor.MAX_ANALYSIS_FRAMES}-frame analysis budget.`);
  if (frameAnalyses.some((frame) => frame.uncertain)) evidenceWarnings.push("Some visible text or actions were unclear. Check the source before reproducing them.");
  const visualSummary = await visualAnalyzer.summarizeVisuals(frameAnalyses, signal).catch((err) => {
    console.error("[pipeline] Visual summary failed; retaining frame observations:", err instanceof Error ? err.message : err);
    evidenceWarnings.push("Visual summarization failed. Individual frame observations were retained.");
    return frameAnalyses.map((frame) => `[${frame.timestampSec}s] ${frame.description}\n${frame.onScreenText.join("\n")}`).join("\n").slice(0, 12000);
  });
  signal?.throwIfAborted();
  const sourceEvidence = {
    version: 1,
    media_kind: "video",
    scrape_provider: source,
    download_provider: downloadProvider,
    duration_seconds: duration,
    transcript: { status: transcriptionFailed ? "failed" : transcript.trim() ? "available" : "empty", timing: "untimed", characters: transcript.length },
    visuals: {
      status: frameExtractionFailed ? "failed" : visualResult.failedFrameCount ? (frameAnalyses.length ? "partial" : "failed") : frameAnalyses.length ? "available" : "empty",
      extracted_frames: frameResult.paths.length,
      analyzed_frames: frameAnalyses.length,
      failed_frames: visualResult.failedFrameCount,
      interval_seconds: frameResult.intervalUsed,
      sampled_timestamps_seconds: frameResult.timestampsSec,
      max_frames: frameExtractor.MAX_ANALYSIS_FRAMES,
      max_width: frameExtractor.FRAME_MAX_WIDTH,
    },
    warnings: evidenceWarnings,
  };
  costUsd += COST_VISION_PER_FRAME * frameResult.paths.length + COST_VISUAL_SUMMARY;

  // Quality gate — AI decides if content is real and how to route it
  const decision = await qualityGate.evaluateContent({
    transcript,
    caption: scraped.caption,
    visualSummary,
    platform,
    url,
  });
  signal?.throwIfAborted();

  if (!decision.proceed) {
    if (decision.strategy === "article") {
      throw new ServiceError("NOT_A_VIDEO", decision.reason, false);
    }
    throw new ServiceError("NO_CONTENT", decision.reason, false);
  }

  const [userContext, stance] = await Promise.all([
    users.getContext(userId),
    users.getStance(userId),
  ]);
  signal?.throwIfAborted();

  const contentType = await classifyContent({
    transcript,
    caption: scraped.caption,
    visualSummary,
    platform,
    sourceUrl: url,
  });
  costUsd += COST_CLASSIFIER;
  signal?.throwIfAborted();

  const subjectResearch = contentType.needs_search
    ? await enrichSubject({
        transcript,
        visualSummary,
        caption: scraped.caption,
        metadata: scraped.metadata,
        platform,
        sourceUrl: url,
      })
    : null;
  if (subjectResearch) costUsd += COST_SUBJECT_RESEARCH;

  signal?.throwIfAborted();
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
    subjectResearch,
    contentType,
  });

  costUsd += COST_VERDICT;

  signal?.throwIfAborted();
  await analyses.updateResult(analysisId, {
    transcript,
    frameDescriptions: frameAnalyses,
    visualSummary,
    caption: scraped.caption,
    metadata: { ...scraped.metadata, authorName: scraped.authorName, authorUsername: scraped.authorUsername, source_evidence: sourceEvidence, ...(userNote ? { userNote } : {}) },
    verdict,
    status: "done",
    errorMessage: null,
    subjectResearch: subjectResearch as Record<string, unknown> | null,
    contentType: contentType.category,
    actionLane: contentType.action_lane,
    costUsd: Math.round(costUsd * 100000) / 100000,
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
  signal?: AbortSignal,
): Promise<string> {
  signal?.throwIfAborted();
  await analyses.updateStatus(analysisId, "scraping");
  const article = await scraper.scrapeArticle(url);
  signal?.throwIfAborted();

  // Safety net: detect social media login walls (Jina returns platform homepage instead of content)
  const SOCIAL_DOMAINS = ["instagram.com", "tiktok.com", "x.com", "twitter.com"];
  const isSocialMedia = SOCIAL_DOMAINS.some((d) => url.includes(d));
  if (isSocialMedia) {
    const textLower = article.text.toLowerCase();
    const loginWallPatterns = [
      "social media platform for sharing",
      "sign up or log in",
      "log in or sign up",
      "log in to see",
      "sign in to see",
      "create an account",
      "see everyday moments from your close friends",
      "log into instagram",
      "mobile number, usern",
    ];
    if (loginWallPatterns.some((p) => textLower.includes(p))) {
      throw new ServiceError(
        "NO_CONTENT",
        "Couldn't access that post — it may require login. The link might be private or rate-limited. Try again in a minute.",
        false,
      );
    }
  }

  // Quality gate — AI decides if article content is real
  const decision = await qualityGate.evaluateContent({
    transcript: null,
    caption: article.text.slice(0, 500),
    visualSummary: null,
    platform: "article",
    url,
  });
  signal?.throwIfAborted();

  if (!decision.proceed) {
    throw new ServiceError("NO_CONTENT", decision.reason, false);
  }

  // Phase 4: stance + back-compat userContext. Both can be NULL.
  const [userContext, stance] = await Promise.all([
    users.getContext(userId),
    users.getStance(userId),
  ]);
  signal?.throwIfAborted();

  const contentType = await classifyContent({
    transcript: null,
    caption: article.text.slice(0, 3000),
    visualSummary: "",
    platform: "article",
    sourceUrl: url,
  });
  signal?.throwIfAborted();

  const subjectResearch = contentType.needs_search
    ? await enrichSubject({
        transcript: null,
        visualSummary: "",
        caption: article.text.slice(0, 3000),
        metadata: { title: article.title, ...article.metadata },
        platform: "article",
        sourceUrl: url,
      })
    : null;

  signal?.throwIfAborted();
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
    subjectResearch,
    contentType,
  });

  signal?.throwIfAborted();
  await analyses.updateResult(analysisId, {
    transcript: null,
    caption: article.title,
    metadata: {
      ...article.metadata,
      title: article.title,
      source_text: article.text.slice(0, 100_000),
      source_evidence: {
        version: 1,
        media_kind: "article",
        warnings: ["Only webpage text was analyzed. No video or audio was observed.", ...(article.text.length > 100_000 ? ["Stored webpage text was limited to 100,000 characters."] : [])],
      },
      ...(userNote ? { userNote } : {}),
    },
    verdict,
    status: "done",
    errorMessage: null,
    subjectResearch: subjectResearch as Record<string, unknown> | null,
    contentType: contentType.category,
    actionLane: contentType.action_lane,
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
  options: { deferFailureHandling?: boolean } = {},
): Promise<void> {
  try {
    if (platform === "article") {
      await executeArticlePipeline(userId, analysisId, url, userNote);
    } else {
      try {
        await executeVideoPipeline(userId, analysisId, url, platform, userNote);
      } catch (videoErr) {
        const errCode = videoErr instanceof ServiceError ? videoErr.code : "";
        // Fall back to article pipeline for image posts (NOT_A_VIDEO) and
        // video download failures (DOWNLOAD_FAILED — e.g. CDN unavailable after Apify scrape).
        // Login wall detector in executeArticlePipeline catches social URLs that Jina can't read.
        if (errCode === "NOT_A_VIDEO" || errCode === "DOWNLOAD_FAILED") {
          console.log(`[pipeline] Video unavailable (${errCode}), falling back to article pipeline: ${url}`);
          await executeArticlePipeline(userId, analysisId, url, userNote);
        } else {
          throw videoErr;
        }
      }
    }
  } catch (err) {
    console.error("[pipeline] executePipeline error:", err);
    // The queue owns retry decisions and refunds only after its final failed attempt.
    if (options.deferFailureHandling) throw err;
    const rawMessage =
      err instanceof ServiceError ? err.message : "An unexpected error occurred";

    await analyses.updateResult(analysisId, {
      status: "failed",
      errorMessage: rawMessage,
    });
    await credits.refundAnalysis(analysisId);

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
  signal?: AbortSignal,
): Promise<void> {
  const verdict = await executeVideoPipeline(userId, analysisId, url, platform, userNote, signal);
  signal?.throwIfAborted();
  await sendVerdict(ctx, analysisId, verdict, url, userId, replyToMessageId);
}

async function runArticlePipeline(
  ctx: MyContext,
  userId: string,
  analysisId: string,
  url: string,
  replyToMessageId?: number,
  userNote?: string,
  signal?: AbortSignal,
): Promise<void> {
  const verdict = await executeArticlePipeline(userId, analysisId, url, userNote, signal);
  signal?.throwIfAborted();
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

  // Apr 25 redesign — both buttons are PASSIVE navigation.
  //   📍 Open in dashboard — bridge to the action archive
  //   🔗 View original — back-link to the source URL (let the user inspect)
  //
  // The previous "Just watched it" set-aside button was the wrong moment. The
  // user just received the verdict; they can't have decided yet. State changes
  // belong on the dashboard where the user has context.
  //
  // The action_setaside_* callback handler in bot.ts is kept as a no-op for
  // back-compat (old Telegram messages still have the old button until they
  // scroll out of view).
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

  keyboard.url("🔗 View original", sourceUrl);

  // Telegram render: strip the 🪜 "go further" block — that line lives on the
  // dashboard only. Storage already has the full verdict; we only trim at send.
  const telegramVerdict = verdictGenerator.renderForTelegram(verdict);

  await ctx.reply(telegramVerdict, {
    reply_markup: keyboard,
    ...replyOpts(ctx, replyToMessageId),
  });
}

/**
 * Apr 26 — agentic understanding step. Identify the named subject of the
 * post (one cheap LLM call) and look it up on the web (one Responses API
 * call with web_search tool). Returns null silently on no-subject or any
 * failure — the pipeline continues with post-only context. Cost: ~$0.001
 * for the extractor; ~$0.025 for the search WHEN it fires (skipped for
 * generic content with no clear named subject).
 */
async function enrichSubject(input: {
  transcript: string | null;
  visualSummary: string;
  caption: string;
  metadata: Record<string, unknown>;
  platform: string;
  sourceUrl: string;
}): Promise<SubjectResearch | null> {
  try {
    const subject = await extractSubject(input);
    if (!subject) return null;
    return await researchSubject(subject);
  } catch (err) {
    console.error("[pipeline] subject enrichment failed (continuing):", err instanceof Error ? err.message : err);
    return null;
  }
}
