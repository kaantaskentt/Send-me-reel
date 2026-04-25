import type { MyContext } from "./context.js";
import { extractUrl } from "../pipeline/urlRouter.js";
import { runPipeline } from "../pipeline/orchestrator.js";
import * as users from "../db/users.js";

const CHAT_PATTERNS = /summarize|explain|chat|can you|tell me|what do you think|help me/i;

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

  // Apr 25 — vertical filter REMOVED. The bot used to pre-classify URLs and
  // refuse anything that didn't look like AI / tech / business with a "try
  // anyway" prompt. In production it produced false positives (e.g. calling
  // ordinary reels "fashion content"), and the prejudgement felt heavy-handed.
  // Now: link comes in, pipeline runs, dashboard receives. Simple.

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

// Apr 25 — handleTryAnyway / handleTryAnywayDismiss removed. The vertical
// filter that needed them is gone. Old in-flight Telegram messages with the
// tryanyway_* callback buttons will now receive an unanswered callback —
// fine, they'll just stop spinning after a few seconds.
