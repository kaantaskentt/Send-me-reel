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
      `You've got <b>${balance} analyses</b> ready to go.\n` +
      demoPrompt +
      "\nDrop any Instagram, TikTok, X, LinkedIn, or article link and I'll break it down for you.\n\n" +
      "<i>Commands:</i>\n" +
      "/credits — Check your balance\n" +
      "/profile — View your profile\n" +
      "/dashboard — Open your web dashboard\n" +
      "/reset — Update your profile",
    { parse_mode: "HTML" },
  );
}

export async function handleHelp(ctx: MyContext) {
  await ctx.reply(
    "<b>ContextDrop</b> — Send it. Understand it. Actually use it.\n\n" +
      "Send me any video link from Instagram, TikTok, X, LinkedIn, YouTube and I'll:\n" +
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
    `<b>Your analyses</b>\n\n` +
      `Available: <b>${balance}</b>\n` +
      `Used so far: <b>${used}</b>\n\n` +
      "<i>1 analysis = 1 link breakdown.</i> Send any video or article and I'll spend one to break it down for you.",
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

  const lines = [
    `<b>Your Profile</b>`,
    ``,
    `<b>Role:</b> ${context.role}`,
    `<b>Focus:</b> ${context.goal}`,
  ];
  if (context.contentPreferences) {
    lines.push(`<b>Priorities:</b> ${context.contentPreferences}`);
  }
  lines.push(`<b>Deep Profile:</b> ${hasExtended}`);
  lines.push(``);
  lines.push("Use /reset to update basics, or /dashboard to edit your full profile on the web.");

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
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
