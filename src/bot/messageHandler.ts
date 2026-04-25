import { InlineKeyboard } from "grammy";
import type { MyContext } from "./context.js";
import { extractUrl } from "../pipeline/urlRouter.js";
import { runPipeline } from "../pipeline/orchestrator.js";
import * as users from "../db/users.js";
import * as verticalClassifier from "../services/verticalClassifier.js";

const CHAT_PATTERNS = /summarize|explain|chat|can you|tell me|what do you think|help me/i;

// Phase 4 vertical filter — short-lived in-memory map of "try anyway" tokens.
// Key: short random id; Value: { url, userNote, expiresAt }.
// Lives ~10 minutes — long enough for the user to read the redirect and tap,
// short enough that we don't accumulate state. Process restart wipes them
// (which is fine — user can resend the link).
const tryAnywayQueue = new Map<
  string,
  { url: string; userNote?: string; messageId?: number; expiresAt: number }
>();

function makeToken(): string {
  return Math.random().toString(36).slice(2, 10);
}

function gcQueue(): void {
  const now = Date.now();
  for (const [k, v] of tryAnywayQueue) {
    if (v.expiresAt < now) tryAnywayQueue.delete(k);
  }
}

export async function handleMessage(ctx: MyContext) {
  const text = ctx.message?.text;
  if (!text) return;

  const url = extractUrl(text);

  // No URL — respond instead of going silent
  if (!url) {
    const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
    if (isGroup) return; // Stay quiet in groups for non-link messages

    const from = ctx.from;
    if (!from) return;

    const user = await users.getByTelegramId(from.id);

    if (!user || !user.onboarded) {
      await ctx.reply(
        "Hey. <b>ContextDrop</b> here. I help with the AI / tech / business stuff you save.\n\n" +
          "Tap /start to set up (10 seconds).",
        { parse_mode: "HTML" },
      );
      return;
    }

    if (CHAT_PATTERNS.test(text)) {
      await ctx.reply(
        "I'm a link bot, not a chat bot. Send a link and I'll do the rest.\n\n" +
          "/dashboard to revisit what's saved.",
      );
      return;
    }

    await ctx.reply(
      "Send a link. Instagram, TikTok, X, LinkedIn, YouTube, or an article.\n\n" +
        "/dashboard to revisit what's saved.",
    );
    return;
  }

  const isGroup =
    ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
  const messageId = ctx.message?.message_id;

  // In groups: check if user is onboarded before running pipeline
  if (isGroup && ctx.from) {
    const user = await users.getByTelegramId(ctx.from.id);
    if (!user || !user.onboarded) {
      await ctx.reply(
        `@${ctx.from.username || ctx.from.first_name} DM me first to set up your profile, then come back here → https://t.me/contextdrop2027bot`,
        { reply_parameters: messageId ? { message_id: messageId } : undefined },
      );
      return;
    }
  }

  // Capture any non-URL text the user sent along with the link —
  // their "note" about why they're saving this. Used as additional prompt context.
  const userNote = text.replace(url, "").trim() || undefined;

  // Phase 4: soft vertical filter. Refuse non-AI/tech/business content with a
  // "try anyway" escape hatch. Err generous — we only refuse when confidence > 0.7.
  // Run the classifier in parallel with the rest of the message handling so it
  // doesn't add latency in the common case (we await before deciding).
  gcQueue();
  const decision = await verticalClassifier.classifyUrl(url, userNote);
  if (verticalClassifier.shouldRefuse(decision)) {
    const token = makeToken();
    tryAnywayQueue.set(token, {
      url,
      userNote,
      messageId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const keyboard = new InlineKeyboard()
      .text("Yes, try it", `tryanyway_${token}`)
      .text("I'll save it elsewhere", `tryanyway_dismiss_${token}`);

    const topic = decision.reason || "this kind of content";
    await ctx.reply(
      `Looks like ${topic}. I'm built for the AI / tech / business stuff. I won't do my best work here. Want me to try anyway? No charge unless you tap yes.`,
      {
        reply_markup: keyboard,
        ...(isGroup && messageId ? { reply_parameters: { message_id: messageId } } : {}),
      },
    );
    return;
  }

  // Run pipeline — pass messageId so replies can thread in groups.
  // Fire-and-forget (don't block other incoming messages), but ensure we ALWAYS reply
  // even if the pipeline throws before sending its own message.
  runPipeline(ctx, url, messageId, userNote).catch(async (err) => {
    console.error("[handler] Pipeline crashed at top level:", err);
    try {
      const replyOpts = isGroup && messageId ? { reply_parameters: { message_id: messageId } } : {};
      await ctx.reply(
        "Something broke on our end. Logged it. Try again in a sec.",
        replyOpts,
      );
    } catch (replyErr) {
      console.error("[handler] Failed to send fallback error reply:", replyErr);
    }
  });
}

/**
 * Phase 4 — handles the "Yes, try it" callback after the vertical filter
 * refused a URL. Looks up the queued URL and runs the pipeline normally.
 *
 * Exposed so bot.ts can register it alongside the other callback handlers.
 */
export async function handleTryAnyway(ctx: MyContext, token: string): Promise<void> {
  const entry = tryAnywayQueue.get(token);
  tryAnywayQueue.delete(token);
  if (!entry || entry.expiresAt < Date.now()) {
    await ctx.answerCallbackQuery({
      text: "That option timed out. Send the link again.",
      show_alert: true,
    });
    return;
  }
  await ctx.answerCallbackQuery({ text: "On it." });
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  } catch {
    // Non-critical
  }

  const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
  runPipeline(ctx, entry.url, entry.messageId, entry.userNote).catch(async (err) => {
    console.error("[handler] try-anyway pipeline crashed:", err);
    try {
      const replyOpts = isGroup && entry.messageId ? { reply_parameters: { message_id: entry.messageId } } : {};
      await ctx.reply(
        "Something went wrong on our end. Try again in a moment.",
        replyOpts,
      );
    } catch {
      // ignore
    }
  });
}

/**
 * Phase 4 — handles the "I'll save it elsewhere" dismiss callback. Cleans up
 * the queue entry and acknowledges with a calm one-liner.
 */
export async function handleTryAnywayDismiss(ctx: MyContext, token: string): Promise<void> {
  tryAnywayQueue.delete(token);
  await ctx.answerCallbackQuery({ text: "Got it. No charge." });
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  } catch {
    // ignore
  }
}
