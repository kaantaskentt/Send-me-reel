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
        "Hey — I'm <b>ContextDrop</b>. I break down videos and articles into personalized insights.\n\n" +
          "Tap /start to get set up (30 seconds).",
        { parse_mode: "HTML" },
      );
      return;
    }

    if (CHAT_PATTERNS.test(text)) {
      await ctx.reply(
        "I'm a link breakdown bot, not a chat bot. Send me any video or article link and I'll break it down for you.\n\n" +
          "/dashboard to revisit past analyses.",
      );
      return;
    }

    await ctx.reply(
      "Send me a link — Instagram, TikTok, X, LinkedIn, YouTube, or an article — and I'll break it down.\n\n" +
        "/dashboard to see your saved analyses.",
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

  // Run pipeline — pass messageId so replies can thread in groups.
  // Fire-and-forget (don't block other incoming messages), but ensure we ALWAYS reply
  // even if the pipeline throws before sending its own message.
  runPipeline(ctx, url, messageId).catch(async (err) => {
    console.error("[handler] Pipeline crashed at top level:", err);
    try {
      const replyOpts = isGroup && messageId ? { reply_parameters: { message_id: messageId } } : {};
      await ctx.reply(
        "Something went wrong on our end — we've logged it. Try again in a moment.",
        replyOpts,
      );
    } catch (replyErr) {
      console.error("[handler] Failed to send fallback error reply:", replyErr);
    }
  });
}
