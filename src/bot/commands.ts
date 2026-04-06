import { SignJWT } from "jose";
import type { MyContext } from "./context.js";
import * as users from "../db/users.js";
import * as credits from "../db/credits.js";
import { config } from "../config.js";

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
  const used = await credits.getLifetimeUsed(user.id);

  const demoPrompt =
    used === 0
      ? "\nTry it right now — paste this link:\nhttps://www.instagram.com/reel/DFnVBmxx2Lj/\n"
      : "";

  await ctx.reply(
    `Welcome back, <b>${from.first_name ?? "there"}</b>!\n\n` +
      `You have <b>${balance} credits</b> remaining.\n` +
      demoPrompt +
      "\nSend me any Instagram, TikTok, X, or article link to analyze it.\n\n" +
      "Commands:\n" +
      "/credits — Check your balance\n" +
      "/profile — View your context profile\n" +
      "/dashboard — Open your web dashboard\n" +
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
      "4. Break it down for <i>you</i>\n\n" +
      "You can also send article URLs.\n\n" +
      "Try it now — paste this link:\nhttps://www.instagram.com/reel/DFnVBmxx2Lj/\n\n" +
      "Commands:\n" +
      "/start — Get started or see welcome message\n" +
      "/credits — Check your credit balance\n" +
      "/profile — View your context profile\n" +
      "/dashboard — Open your web dashboard\n" +
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

  const hasExtended = context.extendedContext ? "Yes" : "No";

  await ctx.reply(
    `<b>Your Profile</b>\n\n` +
      `<b>Role:</b> ${context.role}\n` +
      `<b>Focus:</b> ${context.goal}\n` +
      `<b>Priorities:</b> ${context.contentPreferences}\n` +
      `<b>Deep Profile:</b> ${hasExtended}\n\n` +
      "Use /reset to update basics, or /dashboard to edit your full profile on the web.",
    { parse_mode: "HTML" },
  );
}

export async function handleReset(ctx: MyContext) {
  await ctx.conversation.enter("onboarding");
}

export async function handleDashboard(ctx: MyContext) {
  const from = ctx.from;
  if (!from) return;

  const user = await users.getByTelegramId(from.id);
  if (!user) {
    await ctx.reply("Please /start first to create your account.");
    return;
  }

  if (!config.jwtSecret) {
    await ctx.reply("Dashboard is not configured yet. Coming soon!");
    return;
  }

  const secret = new TextEncoder().encode(config.jwtSecret);
  const token = await new SignJWT({
    sub: user.id,
    username: user.telegram_username || String(from.id),
    tid: from.id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(secret);

  const dashboardUrl = `${config.appUrl}/auth?token=${token}`;

  await ctx.reply(
    `<b>Your Dashboard</b>\n\n` +
      `Tap below to open your personal dashboard:\n\n` +
      `<a href="${dashboardUrl}">Open Dashboard</a>\n\n` +
      `<i>This link is personal — don't share it.</i>`,
    { parse_mode: "HTML" },
  );
}
