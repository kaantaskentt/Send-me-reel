import type { Conversation } from "@grammyjs/conversations";
import type { MyContext } from "./context.js";
import * as users from "../db/users.js";
import * as notion from "../services/notion.js";

type MyConversation = Conversation<MyContext, MyContext>;

export async function notionSetup(conversation: MyConversation, ctx: MyContext) {
  const user = await conversation.external(async () => {
    return users.getByTelegramId(ctx.from!.id);
  });

  if (!user) {
    await ctx.reply("Please /start first.");
    return;
  }

  // Check if already connected
  const existing = await conversation.external(async () => {
    return users.getNotionInfo(user.id);
  });

  if (existing) {
    await ctx.reply(
      "✅ Notion is already connected!\n\n" +
        "Every time you tap Learn or Apply, it auto-saves there.\n\n" +
        "To reconnect with a new token, just paste it now. Or send /cancel to keep your current connection.",
    );
  } else {
    await ctx.reply(
      "Let's connect your Notion! 📝\n\n" +
        "<b>Quick setup (60 seconds):</b>\n\n" +
        "1️⃣ Go to notion.so/profile/integrations\n" +
        "2️⃣ Click <b>\"New integration\"</b> → Internal\n" +
        "3️⃣ Name it <b>ContextDrop</b>\n" +
        "4️⃣ Copy the <b>Internal Integration Secret</b>\n" +
        "5️⃣ Paste it here 👇\n\n" +
        "<i>Important: After creating it, go to any Notion page → click ••• menu → \"Connect to\" → select ContextDrop. This gives it access to that page.</i>",
      { parse_mode: "HTML" },
    );
  }

  // Wait for token
  const tokenCtx = await conversation.waitFor("message:text");
  const token = tokenCtx.message.text.trim();

  if (token === "/cancel") {
    await ctx.reply("Notion setup cancelled.");
    return;
  }

  // Validate token format
  if (!token.startsWith("ntn_") && !token.startsWith("secret_")) {
    await ctx.reply(
      "❌ That doesn't look like a Notion token.\n\n" +
        "It should start with <b>ntn_</b> or <b>secret_</b>.\n\n" +
        "Try /notion again when you have the token.",
      { parse_mode: "HTML" },
    );
    return;
  }

  await ctx.reply("🔄 Verifying token and setting up your workspace...");

  try {
    const result = await conversation.external(async () => {
      return notion.setupWorkspace(token);
    });

    await conversation.external(async () => {
      await users.saveNotionToken(
        ctx.from!.id,
        token,
        "",
        result.workspaceName,
        result.databaseId,
      );
    });

    await ctx.reply(
      "✅ Notion connected!\n\n" +
        "I created a <b>ContextDrop</b> database in your workspace.\n\n" +
        "From now on, tapping 📚 Learn or ⚡ Apply will auto-save there. Try it!",
      { parse_mode: "HTML" },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await ctx.reply(
      `❌ Couldn't connect: ${msg}\n\n` +
        "Make sure you:\n" +
        "• Copied the full token\n" +
        "• Shared at least one page with the integration\n\n" +
        "Try /notion again when ready.",
    );
  }
}
