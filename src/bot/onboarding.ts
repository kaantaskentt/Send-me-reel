import { InlineKeyboard } from "grammy";
import type { Conversation } from "@grammyjs/conversations";
import type { MyContext } from "./context.js";
import * as users from "../db/users.js";

type MyConversation = Conversation<MyContext, MyContext>;

/**
 * Onboarding conversation — captures Role + Focus from the user.
 *
 * Demi feedback (April 2026):
 * - Cut the old "priority topics / never relevant" Q3 — felt invasive and confusing
 * - Reworded Q2 to feel less like an interrogation
 * - Replaced text-based Yes/No confirmation with InlineKeyboard buttons because
 *   text confirmation was swallowing typed commands like "/start" and "Hello?"
 *   as if they were profile answers.
 */
export async function onboarding(conversation: MyConversation, ctx: MyContext) {
  let confirmed = false;

  while (!confirmed) {
    await ctx.reply(
      "Welcome to <b>ContextDrop</b>! I break down videos and articles so you can actually use what you watch.\n\n" +
        "Two quick questions so I can tailor your breakdowns. Just type it out.\n\n" +
        "<b>1/2:</b> What do you do?\n" +
        "<i>(e.g. startup founder, product designer, marketing lead, student)</i>",
      { parse_mode: "HTML" },
    );

    const roleCtx = await conversation.waitFor("message:text");
    const role = roleCtx.message.text.trim();

    await ctx.reply(
      "<b>2/2:</b> What kind of content are you looking to break down?\n" +
        "<i>(e.g. AI tools, marketing tactics, productivity tips, design inspo — anything)</i>",
      { parse_mode: "HTML" },
    );

    const goalCtx = await conversation.waitFor("message:text");
    const goal = goalCtx.message.text.trim();

    // Show summary with Yes / Redo buttons (NO text confirmation — buttons only)
    const confirmKeyboard = new InlineKeyboard()
      .text("✓ Looks good", "onboarding_confirm")
      .text("↻ Redo", "onboarding_redo");

    await ctx.reply(
      "Here's what I've got:\n\n" +
        `<b>Role:</b> ${role}\n` +
        `<b>Focus:</b> ${goal}`,
      { parse_mode: "HTML", reply_markup: confirmKeyboard },
    );

    // Wait for a button press — text replies are ignored entirely
    const callbackCtx = await conversation.waitForCallbackQuery(
      /^onboarding_(confirm|redo)$/,
    );
    const action = callbackCtx.match[1];

    // Acknowledge the button press to remove the "loading" spinner
    await callbackCtx.answerCallbackQuery();

    if (action === "confirm") {
      confirmed = true;

      // Save to database. contentPreferences is now optional — omitted entirely.
      const telegramId = ctx.from!.id;
      await conversation.external(async () => {
        const user = await users.getByTelegramId(telegramId);
        if (!user) return;

        await users.upsertContext(
          user.id,
          { role, goal },
          { q1_role: role, q2_goal: goal },
        );
        await users.setOnboarded(user.id, true);
      });

      await ctx.reply(
        "Perfect — you're set up.\n\n" +
          "Try it right now — paste this link:\n\n" +
          "https://www.instagram.com/reel/DFnVBmxx2Lj/\n\n" +
          "Or send any Instagram, TikTok, X, LinkedIn, YouTube, or article link.\n" +
          "You've got <b>50 free analyses</b> to play with — that's plenty.",
        { parse_mode: "HTML" },
      );
    } else {
      await ctx.reply("No worries — let's redo it.");
      // Loop continues back to Q1
    }
  }
}
