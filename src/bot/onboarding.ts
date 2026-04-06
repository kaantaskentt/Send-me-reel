import type { Conversation } from "@grammyjs/conversations";
import type { MyContext } from "./context.js";
import * as users from "../db/users.js";

type MyConversation = Conversation<MyContext, MyContext>;

export async function onboarding(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply(
    "Welcome to <b>ContextDrop</b>! I analyze social media videos and give you personalized, actionable insights.\n\n" +
      "Before I can do that, I need to understand who you are. Three quick questions — just reply naturally.\n\n" +
      "<b>Question 1/3:</b> What do you do?\n" +
      "<i>(e.g. startup founder, product designer, marketing lead, student)</i>",
    { parse_mode: "HTML" },
  );

  const roleCtx = await conversation.waitFor("message:text");
  const role = roleCtx.message.text;

  await ctx.reply(
    "<b>Question 2/3:</b> What are you actively working on or trying to learn right now?\n" +
      "<i>(mention as many things as you like)</i>",
    { parse_mode: "HTML" },
  );

  const goalCtx = await conversation.waitFor("message:text");
  const goal = goalCtx.message.text;

  await ctx.reply(
    "<b>Question 3/3:</b> What topics should I always flag as high priority? And any topics that are never relevant?\n" +
      "<i>(e.g. always flag: AI tools, no-code. Never relevant: crypto, gaming)</i>",
    { parse_mode: "HTML" },
  );

  const prefCtx = await conversation.waitFor("message:text");
  const contentPreferences = prefCtx.message.text;

  // Save to database
  const telegramId = ctx.from!.id;
  await conversation.external(async () => {
    const user = await users.getByTelegramId(telegramId);
    if (!user) return;

    await users.upsertContext(
      user.id,
      { role, goal, contentPreferences },
      { q1_role: role, q2_goal: goal, q3_preferences: contentPreferences },
    );
    await users.setOnboarded(user.id, true);
  });

  await ctx.reply(
    "You're all set! Here's your profile:\n\n" +
      `<b>Role:</b> ${role}\n` +
      `<b>Focus:</b> ${goal}\n` +
      `<b>Priorities:</b> ${contentPreferences}\n\n` +
      "Try it right now — paste this link:\n\n" +
      "https://www.instagram.com/reel/DFnVBmxx2Lj/\n\n" +
      "Or send any Instagram, TikTok, X, or article link.\n" +
      "You have <b>10 free credits</b> to start.",
    { parse_mode: "HTML" },
  );
}
