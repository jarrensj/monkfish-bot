// Main Telegram bot entry point - bootstraps bot and registers commands

import "dotenv/config";
import { Telegraf } from "telegraf";
import { registerWalletCommands } from "./commands/walletCommands";
import { registerTosCommands } from "./commands/tosCommands";
import { loggingMiddleware, userInit } from "./middleware";
import { registerHealthCommands } from "./commands/healthCommands";
import { registerSwapCommands } from "./commands/swapCommands";
import { registerAlgoCommands } from "./commands/algoCommands";
import { registerHelpCommands } from "./commands/helpCommands";

// Verify bot token is configured
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN in .env");
  process.exit(1);
}

// verify logging webhook (won't exit if missing, just won't log)
const loggingWebhookUrl = process.env.LOGGING_WEBHOOK_URL;
if (!loggingWebhookUrl) {
  console.warn("⚠️  LOGGING_WEBHOOK_URL not set - message logging disabled");
}

// Initialize bot and services
const bot = new Telegraf(token);

// Apply middleware (order matters: init user → logging, etc.)
registerHelpCommands(bot); //public
bot.use(userInit);
bot.use(loggingMiddleware());

// Register all command groups
registerTosCommands(bot);
registerHealthCommands(bot);
registerWalletCommands(bot);
registerSwapCommands(bot);
registerAlgoCommands(bot);


// Start bot and setup graceful shutdown
bot
  .launch()
  .then(() => console.log("Monkfish bot launched"))
  .catch((err) => {
    console.error("Failed to launch bot:", err);
    process.exitCode = 1;
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// Optional: surface unhandled rejections in dev
process.on("unhandledRejection", (e) => {
  console.error("UnhandledRejection:", e);
});