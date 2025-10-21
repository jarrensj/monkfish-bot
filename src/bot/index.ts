// Main Telegram bot entry point - bootstraps bot and registers commands

import "dotenv/config";
import { Telegraf } from "telegraf";
import { makeWalletService } from "../core/services/wallet";
import { registerWalletCommands } from "./commands/walletCommands";
import { registerUtilCommands } from "./commands/utils";

// Verify bot token is configured
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}

// Initialize bot and services
const bot = new Telegraf(token);
const wallet = makeWalletService();

// Register all command groups
registerUtilCommands(bot);
registerWalletCommands(bot, wallet);

// Start bot and setup graceful shutdown
bot.launch().then(() => console.log("Monkfish bot launched"));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
