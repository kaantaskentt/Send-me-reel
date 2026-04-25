import { Bot, session } from "grammy";
import { SignJWT } from "jose";
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

async function makeDashboardLink(user: { id: string; telegram_username: string | null }, telegramId: number): Promise<string> {
  if (!config.jwtSecret) return `${config.appUrl}`;
  const secret = new TextEncoder().encode(config.jwtSecret);
  const username = user.telegram_username || String(telegramId);
  const token = await new SignJWT({
    sub: user.id,
    username,
    tid: telegramId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(secret);
  return `${config.appUrl}/auth?token=${token}`;
}

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

  // Phase 2 — "Just watched it" sets the analysis to set_aside in one tap.
  // Encodes the strategy at the interaction level: explicit permission to
  // not act, no homework, no shame. (transformation-plan §10)
  bot.callbackQuery(/^action_setaside_([^_]+)_(\d+)$/, async (ctx) => {
    const match = ctx.match as RegExpMatchArray;
    const analysisId = match[1];
    const ownerTelegramId = parseInt(match[2], 10);
    const from = ctx.from;
    if (!from) return;

    if (from.id !== ownerTelegramId) {
      await ctx.answerCallbackQuery({
        text: "This isn't your analysis.",
        show_alert: true,
      });
      return;
    }

    try {
      await analyses.markSetAside(analysisId);
      await ctx.answerCallbackQuery({
        text: "Set aside. No homework today.",
      });
      // Edit the inline keyboard so the button doesn't get tapped again
      try {
        await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      } catch {
        // Editing can fail if the message is too old — non-critical
      }
    } catch (err) {
      console.error("[bot] setaside callback failed:", err);
      await ctx.answerCallbackQuery({
        text: "Something didn't work. Try again from the dashboard.",
        show_alert: true,
      });
    }
  });

  // Action button callbacks — format: action_{dashboard|notion}_{analysisId}_{telegramId}
  bot.callbackQuery(/^action_(dashboard|notion)_([^_]+)_(\d+)$/, async (ctx) => {
    const match = ctx.match as RegExpMatchArray;
    const action = match[1];
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

    const user = await users.getByTelegramId(from.id);
    if (!user) return;

    if (action === "dashboard") {
      await ctx.answerCallbackQuery({ text: "Opening dashboard..." });
      const dashLink = await makeDashboardLink(user, from.id);
      await ctx.reply(
        `📋 <a href="${dashLink}">Open your dashboard</a>`,
        { parse_mode: "HTML" },
      );
      return;
    }

    // action === "notion"
    const notionInfo = await users.getNotionInfo(user.id);

    if (!notionInfo) {
      // Not connected — send direct OAuth link that auto-saves after connecting
      await ctx.answerCallbackQuery({ text: "Let's connect Notion" });

      if (!config.jwtSecret) {
        await ctx.reply("Notion connection is not configured.");
        return;
      }

      const secret = new TextEncoder().encode(config.jwtSecret);
      const username = user.telegram_username || String(from.id);
      const token = await new SignJWT({
        sub: user.id,
        username,
        tid: from.id,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .setIssuedAt()
        .sign(secret);

      const connectUrl = `${config.appUrl}/api/auth/notion/connect?token=${token}&analysisId=${analysisId}`;

      const connectMessage =
        "To save this analysis, connect your Notion (one-time setup).\n\n" +
        "You'll pick a page where ContextDrop can save — we'll create a database there automatically. We only access the page you choose.\n\n" +
        `<a href="${connectUrl}">Connect Notion & Save</a>`;

      // In groups, send the connect link via DM to avoid exposing the auth token
      const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
      if (isGroup) {
        try {
          await ctx.api.sendMessage(from.id, connectMessage, { parse_mode: "HTML" });
          await ctx.reply("Check your DMs — I sent a link to connect Notion.");
        } catch {
          // DM failed (user hasn't started bot in DM), fall back to group reply
          await ctx.reply(connectMessage, { parse_mode: "HTML" });
        }
      } else {
        await ctx.reply(connectMessage, { parse_mode: "HTML" });
      }
      return;
    }

    // Connected — push to Notion
    await ctx.answerCallbackQuery({ text: "Saving to Notion..." });

    try {
      const analysis = await analyses.getById(analysisId);
      if (!analysis || !analysis.verdict) {
        await ctx.reply("Couldn't find this analysis. Try again.");
        return;
      }

      await notion.pushAnalysis(
        notionInfo.token,
        notionInfo.databaseId,
        {
          verdict: analysis.verdict,
          transcript: analysis.transcript,
          visualSummary: analysis.visual_summary,
          sourceUrl: analysis.source_url,
          platform: analysis.platform,
          intent: "saved",
        },
      );

      await ctx.reply("✅ Saved to Notion");
    } catch (err) {
      console.error("Notion push error:", err);
      await ctx.reply("Couldn't save to Notion right now. Try again from your dashboard.");
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
