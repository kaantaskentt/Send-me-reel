import type { MyContext } from "./context.js";
import * as users from "../db/users.js";
import * as credits from "../db/credits.js";

export async function handleStart(ctx: MyContext) {
  const from = ctx.from;
  if (!from) return;

  const { user, isNew } = await users.getOrCreate(
    from.id,
    from.username,
    from.first_name,
  );

  if (isNew || !user.onboarded) {
    await ctx.conversation.enter("onboarding");
    return;
  }

  const balance = await credits.getBalance(user.id);
  await ctx.reply(
    `Welcome back, <b>${from.first_name ?? "there"}</b>!\n\n` +
      `You have <b>${balance} credits</b> remaining.\n\n` +
      "Send me any Instagram, TikTok, or X video link to analyze it.\n\n" +
      "Commands:\n" +
      "/credits — Check your balance\n" +
      "/profile — View your context profile\n" +
      "/reset — Update your profile",
    { parse_mode: "HTML" },
  );
}

export async function handleHelp(ctx: MyContext) {
  await ctx.reply(
    "<b>ContextDrop</b> — Send it. Understand it. Actually use it.\n\n" +
      "Send me any video link from Instagram, TikTok, or X and I'll:\n" +
      "1. Transcribe what's said\n" +
      "2. Analyze what's shown on screen\n" +
      "3. Extract all tools, links, and resources\n" +
      "4. Tell you exactly why it matters to <i>you</i>\n\n" +
      "You can also send article URLs for text-based analysis.\n\n" +
      "Commands:\n" +
      "/start — Get started or see welcome message\n" +
      "/credits — Check your credit balance\n" +
      "/profile — View your context profile\n" +
      "/reset — Update your profile",
    { parse_mode: "HTML" },
  );
}

export async function handleCredits(ctx: MyContext) {
  const from = ctx.from;
  if (!from) return;

  const user = await users.getByTelegramId(from.id);
  if (!user) {
    await ctx.reply("Please /start first to create your account.");
    return;
  }

  const balance = await credits.getBalance(user.id);
  const used = await credits.getLifetimeUsed(user.id);

  await ctx.reply(
    `<b>Credits</b>\n\n` +
      `Balance: <b>${balance}</b>\n` +
      `Lifetime used: <b>${used}</b>\n\n` +
      "Each video analysis costs 1 credit.\n" +
      "Articles cost 1 credit.",
    { parse_mode: "HTML" },
  );
}

export async function handleProfile(ctx: MyContext) {
  const from = ctx.from;
  if (!from) return;

  const user = await users.getByTelegramId(from.id);
  if (!user) {
    await ctx.reply("Please /start first to create your account.");
    return;
  }

  const context = await users.getContext(user.id);
  if (!context) {
    await ctx.reply("No profile found. Use /start to set up your profile.");
    return;
  }

  await ctx.reply(
    `<b>Your Profile</b>\n\n` +
      `<b>Role:</b> ${context.role}\n` +
      `<b>Focus:</b> ${context.goal}\n` +
      `<b>Priorities:</b> ${context.contentPreferences}\n\n` +
      "Use /reset to update your profile.",
    { parse_mode: "HTML" },
  );
}

export async function handleReset(ctx: MyContext) {
  await ctx.conversation.enter("onboarding");
}
