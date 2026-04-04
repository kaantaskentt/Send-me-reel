import { createBot } from "./bot/bot.js";

const bot = createBot();

console.log("ContextDrop bot starting...");
bot.start({
  onStart: () => {
    console.log("ContextDrop bot is running!");
  },
});
