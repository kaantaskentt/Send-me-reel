import { createBot } from "./bot/bot.js";

// Catch unhandled rejections so network errors don't crash the bot
process.on("unhandledRejection", (err) => {
  console.error("[process] Unhandled rejection (caught, not crashing):", err);
});

const bot = createBot();

console.log("ContextDrop bot starting...");
bot.start({
  onStart: () => {
    console.log("ContextDrop bot is running!");
  },
});
