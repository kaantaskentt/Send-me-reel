import { InlineKeyboard } from "grammy";
import type { Conversation } from "@grammyjs/conversations";
import type { MyContext } from "./context.js";
import * as users from "../db/users.js";
import type { UserStance } from "../services/verdictGenerator.js";

type MyConversation = Conversation<MyContext, MyContext>;

/**
 * Phase 4 onboarding — one question, four buttons.
 *
 * Replaces the old 2-question profile (Role + Focus). Production data showed
 * "Role" + "Focus" were producing verdicts like "touches on your agentic
 * system interest" — relevance-filtered output that triggers shame in User B.
 *
 * The new question asks where the user is *with AI* — an emotional position,
 * not a CV claim. Stored as `users.stance` and used only as a tone calibration
 * signal in Pass 2 of the verdict pipeline. Never shown back to the user,
 * never displayed in /profile.
 *
 * Anchor: strategy.md §5.2 + the Apr 24 pivot conversation. Each option
 * traces to a verbatim quote in the research drop:
 *   🌱 Liza Adams (LinkedIn): "I tried AI last year and gave up."
 *   🪞 r/selfimprovement: "feeling completely lost in the ai revolution"
 *   🌀 r/freelance: "I cry at least 5 times a day, every day."
 *   🛠 r/productivity: "I use it a bit, want to use it more on purpose."
 */

const STANCE_OPTIONS: { value: UserStance; label: string }[] = [
  { value: "curious_not_started", label: "🌱 I'm curious but I haven't really started" },
  { value: "watching_not_doing", label: "🪞 I keep watching stuff but never actually try anything" },
  { value: "tried_gave_up", label: "🌀 I tried, got overwhelmed, kind of gave up" },
  { value: "using_want_more", label: "🛠 I use it a bit, want to use it more on purpose" },
];

export async function onboarding(conversation: MyConversation, ctx: MyContext) {
  const keyboard = new InlineKeyboard();
  for (const opt of STANCE_OPTIONS) {
    keyboard.text(opt.label, `stance_${opt.value}`).row();
  }

  await ctx.reply(
    "Hey. <b>ContextDrop</b> here.\n\n" +
      "I help with the AI / tech / business stuff you save and never come back to.\n\n" +
      "Where are you with AI right now? Pick the closest one.",
    { parse_mode: "HTML", reply_markup: keyboard },
  );

  const callbackCtx = await conversation.waitForCallbackQuery(
    /^stance_(curious_not_started|watching_not_doing|tried_gave_up|using_want_more)$/,
  );
  const stance = callbackCtx.match[1] as UserStance;

  await callbackCtx.answerCallbackQuery();

  const telegramId = ctx.from!.id;
  await conversation.external(async () => {
    const user = await users.getByTelegramId(telegramId);
    if (!user) return;
    await users.setStance(user.id, stance);
    await users.setOnboarded(user.id, true);
  });

  // Strip the inline keyboard from the original message so the user can't
  // accidentally re-pick after the conversation ends.
  try {
    await ctx.api.editMessageReplyMarkup(
      callbackCtx.chat!.id,
      callbackCtx.callbackQuery.message!.message_id,
      { reply_markup: undefined },
    );
  } catch {
    // Non-critical — older messages might not be editable
  }

  await ctx.reply(
    "You're set.\n\n" +
      "Send any AI / tech / business reel, podcast, article, or video — I'll send back the smallest thing you could actually try with it.\n\n" +
      "<i>No homework. No catching up. One sip at a time.</i>",
    { parse_mode: "HTML" },
  );
}
