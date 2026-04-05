import type { MyContext } from "./context.js";
import { extractUrl } from "../pipeline/urlRouter.js";
import { runPipeline } from "../pipeline/orchestrator.js";
import * as users from "../db/users.js";

export async function handleMessage(ctx: MyContext) {
  const text = ctx.message?.text;
  if (!text) return;

  const url = extractUrl(text);
  if (!url) return;

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
