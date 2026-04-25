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
      ? "\nTry it now — paste this link:\nhttps://www.instagram.com/reel/DFnVBmxx2Lj/\n"
      : "";

  await ctx.reply(
    `Welcome back, <b>${from.first_name ?? "there"}</b>.\n\n` +
      `You've got <b>${balance} analyses</b> ready.\n` +
      demoPrompt +
      "\nDrop any Instagram, TikTok, X, LinkedIn, YouTube, or article link.\n\n" +
      "/profile · /credits · /dashboard · /reset",
    { parse_mode: "HTML" },
  );
}

export async function handleHelp(ctx: MyContext) {
  await ctx.reply(
    "<b>ContextDrop</b> — I break down videos and articles into personalized insights.\n\n" +
      "Send me any link from Instagram, TikTok, X, LinkedIn, YouTube, or an article URL.\n\n" +
      "Try this one:\nhttps://www.instagram.com/reel/DFnVBmxx2Lj/\n\n" +
      "/profile · /credits · /dashboard · /reset",
    { parse_mode: "HTML" },
  );
}

export async function handleCredits(ctx: MyContext) {
  const from = ctx.from;
  if (!from) return;

  const user = await users.getByTelegramId(from.id);
  if (!user) {
    await ctx.reply("Start with /start to set up your account.");
    return;
  }

  const balance = await credits.getBalance(user.id);
  const used = await credits.getLifetimeUsed(user.id);

  await ctx.reply(
    `<b>${balance} analyses left</b> (${used} used)\n` +
      "<i>1 analysis = 1 link breakdown.</i>",
    { parse_mode: "HTML" },
  );
}

export async function handleProfile(ctx: MyContext) {
  const from = ctx.from;
  if (!from) return;

  const user = await users.getByTelegramId(from.id);
  if (!user) {
    await ctx.reply("Start with /start to set up your account.");
    return;
  }

  // Phase 4: /profile retires the Role/Focus surface in favour of the stance.
  // Stance is shown as a quiet acknowledgement, never a CV claim.
  const stance = await users.getStance(user.id);

  const stanceLabels: Record<string, string> = {
    curious_not_started: "🌱 Curious, haven't really started",
    watching_not_doing: "🪞 Watching, not yet doing",
    tried_gave_up: "🌀 Tried, got overwhelmed, gave up",
    using_want_more: "🛠 Using a bit, want to use more on purpose",
  };

  if (!stance) {
    // Existing pre-Phase-4 user OR fresh user — show legacy context if it exists,
    // otherwise nudge to /start.
    const context = await users.getContext(user.id);
    if (!context) {
      await ctx.reply("No profile yet. Tap /start to set one up.");
      return;
    }
    await ctx.reply(
      "<i>Where you said you are with AI:</i> not set yet\n\n" +
        "/reset to pick · /dashboard to edit on web",
      { parse_mode: "HTML" },
    );
    return;
  }

  await ctx.reply(
    `<i>Where you said you are with AI:</i>\n${stanceLabels[stance] ?? stance}\n\n` +
      "/reset to pick again · /dashboard for the web view",
    { parse_mode: "HTML" },
  );
}

export async function handleReset(ctx: MyContext) {
  await ctx.reply("Let's redo your profile.");
  await ctx.conversation.enter("onboarding");
}

export async function handleDashboard(ctx: MyContext) {
  const from = ctx.from;
  if (!from) return;

  const user = await users.getByTelegramId(from.id);
  if (!user) {
    await ctx.reply("Start with /start to set up your account.");
    return;
  }

  if (!config.jwtSecret) {
    await ctx.reply("Dashboard coming soon.");
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
    `<a href="${dashboardUrl}">Open your dashboard</a>\n` +
      `<i>This link is personal — don't share it.</i>`,
    { parse_mode: "HTML" },
  );
}
