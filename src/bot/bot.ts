import { Bot, session } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import type { MyContext, SessionData } from "./context.js";
import { config } from "../config.js";
import { onboarding } from "./onboarding.js";
import { notionSetup } from "./notionSetup.js";
import {
  handleStart,
  handleHelp,
  handleCredits,
  handleProfile,
  handleReset,
  handleDashboard,
} from "./commands.js";
import { handleMessage } from "./messageHandler.js";
import * as analyses from "../db/analyses.js";
import * as users from "../db/users.js";
import * as notion from "../services/notion.js";

export function createBot(): Bot<MyContext> {
  const bot = new Bot<MyContext>(config.telegramBotToken);

  // Session middleware
  bot.use(
    session({
      initial: (): SessionData => ({}),
    }),
  );

  // Conversations middleware
  bot.use(conversations());
  bot.use(createConversation(onboarding));
  bot.use(createConversation(notionSetup));

  // Commands
  bot.command("start", handleStart);
  bot.command("help", handleHelp);
  bot.command("credits", handleCredits);
  bot.command("profile", handleProfile);
  bot.command("reset", handleReset);
  bot.command("dashboard", handleDashboard);
  bot.command("notion", async (ctx) => {
    await ctx.conversation.enter("notionSetup");
  });

  // Intent button callbacks — format: intent_{learn|apply|ignore}_{analysisId}_{telegramId}
  bot.callbackQuery(/^intent_(learn|apply|ignore)_([^_]+)_(\d+)$/, async (ctx) => {
    const match = ctx.match as RegExpMatchArray;
    const intent = match[1];
    const analysisId = match[2];
    const ownerTelegramId = parseInt(match[3], 10);

    const from = ctx.from;
    if (!from) return;

    // In groups: only the person who sent the link can tap the buttons
    if (from.id !== ownerTelegramId) {
      await ctx.answerCallbackQuery({
        text: "This isn't your analysis. Send your own link!",
        show_alert: true,
      });
      return;
    }

    await analyses.updateIntent(analysisId, intent);
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });

    if (intent === "ignore") {
      await ctx.answerCallbackQuery({ text: "🗑 Skipped" });
      return;
    }

    await ctx.answerCallbackQuery({
      text: intent === "learn" ? "📚 Saved" : "⚡ Saved",
    });

    // Try Notion push
    const user = await users.getByTelegramId(from.id);
    if (!user) return;

    const notionInfo = await users.getNotionInfo(user.id);

    if (!notionInfo) {
      await ctx.reply(
        "💡 Want this saved to Notion automatically?\n\nUse /notion to connect your workspace (takes 60 seconds).",
      );
      return;
    }

    // Push to Notion
    try {
      const analysis = await analyses.getById(analysisId);
      if (!analysis || !analysis.verdict) return;

      const pageUrl = await notion.pushAnalysis(
        notionInfo.token,
        notionInfo.databaseId,
        {
          verdict: analysis.verdict,
          transcript: analysis.transcript,
          visualSummary: analysis.visual_summary,
          sourceUrl: analysis.source_url,
          platform: analysis.platform,
          intent,
        },
      );

      await ctx.reply(`✅ Saved to Notion → ${pageUrl}`);
    } catch (err) {
      console.error("Notion push error:", err);
      await ctx.reply(
        "⚠️ Couldn't push to Notion. Your token may have expired.\n\nUse /notion to reconnect.",
      );
    }
  });

  // Message handler
  bot.on("message:text", handleMessage);

  // Error handler
  bot.catch((err) => {
    console.error("Bot error:", err.error);
    err.ctx?.reply("Something went wrong. Please try again.").catch(() => {});
  });

  return bot;
}
