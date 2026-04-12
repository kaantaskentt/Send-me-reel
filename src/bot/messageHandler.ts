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
        "Hey! I'm <b>ContextDrop</b> — I break down videos and articles so you can actually use what you watch.\n\n" +
          "Tap /start to get set up (takes 30 seconds).",
        { parse_mode: "HTML" },
      );
      return;
    }

    if (CHAT_PATTERNS.test(text)) {
      await ctx.reply(
        "I analyze content from links — not conversations.\n\n" +
          "Send me any Instagram, TikTok, X, LinkedIn, YouTube, or article link and I'll break it down for you.\n\n" +
          "Or use /dashboard to revisit your past analyses.",
      );
      return;
    }

    await ctx.reply(
      "I'm not a chatbot — I'm a content analyzer!\n\n" +
        "Send me any Instagram, TikTok, X, LinkedIn, YouTube, or article link and I'll break it down for you.\n\n" +
        "Or tap /dashboard to see your saved analyses.",
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
        `Hey @${ctx.from.username || ctx.from.first_name}, DM me first to set up your profile → https://t.me/contextdrop2027bot`,
        { reply_parameters: messageId ? { message_id: messageId } : undefined },
      );
      return;
    }
  }

  // Run pipeline — pass messageId so replies can thread in groups
  runPipeline(ctx, url, messageId).catch((err) => {
    console.error("Pipeline error (unhandled):", err);
  });
}
