// HTML-only help menu (not gated by ToS). Lists all public commands + examples.

import type { Telegraf, Context } from "telegraf";

type Bot = Telegraf<Context>;

const HELP_TEXT = [
  "🧭 <b>Monkfish Bot — Help</b>",
  "",
  "This bot is chain-agnostic on the frontend and delegates all trading, wallet, and algo logic to the backend.",
  "Commands below are available to everyone; actions may require accepting ToS first.",
  "",
  "────────────────────",
  "📜 <b>Onboarding & ToS</b>",
  "• <code>/start</code> — Begin, shows ToS if needed",
  "• <code>/tos-accept</code> — Accept the current Terms of Service",
  "• <code>/agree</code> — Alias for <code>/tos-accept</code>",
  "",
  "────────────────────",
  "💼 <b>Wallet</b>",
  "• <code>/start_wallet</code> — Create/view your wallet (idempotent)",
  "• <code>/deposit</code> — Show your deposit address (default: SOL chain for now)",
  "• <code>/balance</code> — Show your wallet balances",
  "",
  "────────────────────",
  "🔁 <b>Swap & Quote</b>",
  "• <code>/quote &lt;asset&gt; &lt;amount&gt;</code> — Get a quote",
  "• <code>/swap  &lt;asset&gt; &lt;amount&gt;</code> — Execute a swap",
  "",
  "Assets can be provided as:",
  "• <code>&lt;mint-address&gt;</code> — e.g., <code>EPjFWdd5...TDt1v</code>",
  "• <code>symbol:chain</code> — e.g., <code>usdc:sol</code>, <code>bonk:sol</code>",
  "• <code>address:chain</code> — EVM-style or other, e.g., <code>0xa0b8...:eth</code>",
  "",
  "<b>Examples (SOL exact-in):</b>",
  "• <code>/quote EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 0.05</code>",
  "• <code>/quote usdc:sol 0.10</code>",
  "• <code>/swap  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 0.05</code>",
  "• <code>/swap  usdc:sol 0.10</code>",
  "",
  "<i>Notes:</i>",
  "• Frontend stays chain-agnostic; backend resolves symbols/mints and performs risk checks.",
  "• Current UX treats the amount as native (e.g., SOL) exact-in unless backend supports pair syntax.",
  "",
  "────────────────────",
  "🤖 <b>Algos (Auto-trading)</b>",
  "• <code>/algos</code> — List available algorithms",
  "• <code>/allocations</code> — Show your current allocations",
  "• <code>/algo_enable &lt;ALGO_CODE&gt; &lt;amountSOL&gt;</code> — Enable/allocate",
  "• <code>/algo_disable &lt;ALGO_CODE&gt; &lt;amountSOL&gt;</code> — Disable/deallocate",
  "",
  "<b>Examples:</b>",
  "• <code>/algo_enable KOI_TREND 2.0</code>",
  "• <code>/algo_disable KOI_TREND 1.0</code>",
  "",
  "────────────────────",
  "ℹ️ <b>Tips</b>",
  "• You can paste a token-like string (symbol or mint); the bot suggests commands.",
  "• Replies are HTML-formatted; no Markdown commands are required.",
  "• For support or issues, try again later or contact an admin with your approximate time and command.",
].join("\n");

export function registerHelpCommands(bot: Bot) {
  const replyOpts = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

  bot.command("help", async (ctx) => {
    await ctx.reply(HELP_TEXT, replyOpts);
  });

  // Alias for convenience
  bot.command("commands", async (ctx) => {
    await ctx.reply(HELP_TEXT, replyOpts);
  });
}