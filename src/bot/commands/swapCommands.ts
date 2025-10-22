/**
 * Swap Commands Module
 * 
 * Registers Telegram bot commands for token swapping functionality:
 * - /quote: Get a price quote for swapping SOL to another token
 * - /swap: Execute a token swap
 * - Auto-detection: Suggests swap commands when user pastes a token symbol/address
 * 
 * All swap operations are currently mocked for development/testing purposes.
 */

import type { Telegraf } from "telegraf";
import type { Message } from "telegraf/types";
import { message } from "telegraf/filters";
import { makeSwapService } from "../../core/services/swap";
import { makeWalletService } from "../../core/services/wallet";
import {
  getSolanaTokenPair,
  toDexTokenQuote,
  resolveMintSmart,
  looksLikeMint,
  escapeHtml,
  underCooldown
} from "./utils";

// Maximum allowed length for token input to prevent spam/abuse
const MAX_TOKEN_INPUT_LEN = 64;

/**
 * Registers all swap-related commands and handlers with the Telegram bot
 * 
 * @param bot - The Telegraf bot instance to register commands on
 */
export function registerSwapCommands(bot: Telegraf) {
  // Initialize services for swap operations and wallet management
  const swapSvc = makeSwapService();
  const walletSvc = makeWalletService();

  /**
   * /quote command - Get a REAL price quote for a token swap (Dexscreener)
   *
   * Usage: /quote <tokenSymbolOrMint> <amountSOL>
   * Example: /quote USDC 0.5
   */
bot.command("quote", async (ctx) => {
  try {
    const text = (ctx.message as Message.TextMessage).text ?? "";
    const [tokenRaw, amountRaw] = text.trim().split(/\s+/).slice(1);

    if (!tokenRaw || !amountRaw) {
      return ctx.reply("Usage: /quote <mintOrSymbol> <amountSOL>\nExample: /quote USDC 0.5");
    }
    if (underCooldown(`quote:${ctx.from!.id}`)) {
      return ctx.reply("⏳ Slow down a sec…");
    }

    const amountSOL = Number(amountRaw);
    if (!Number.isFinite(amountSOL) || amountSOL <= 0) {
      return ctx.reply("Amount must be a number greater than 0.");
    }

    // ✅ New: dynamic symbol→mint
    const mint = await resolveMintSmart(tokenRaw);
    if (!mint || !looksLikeMint(mint)) {
      return ctx.reply("Unknown token. Try a known symbol (e.g., USDC, BONK) or a valid mint address.");
    }

    const loading = await ctx.reply("🔍 Fetching live price…");

    const pair = await getSolanaTokenPair(mint);
    if (!pair) {
      await ctx.telegram.editMessageText(ctx.chat!.id, loading.message_id, undefined, "❌ No price data found.");
      return;
    }

    const q = toDexTokenQuote(pair);
    if (!q) {
      await ctx.telegram.editMessageText(ctx.chat!.id, loading.message_id, undefined, "❌ Invalid price data returned.");
      return;
    }

    const tokensOut = amountSOL / q.priceNative;
    const roughImpactPct = q.liquidityUsd > 0 ? ((amountSOL * q.priceUsd) / q.liquidityUsd) * 100 : 0;

    const sym = escapeHtml(q.symbol);
    const tokIn = escapeHtml(tokenRaw);

    const lines = [
      `📊 <b>Real-Time Quote</b>`,
      ``,
      `💰 <b>Spend:</b> ${amountSOL} SOL`,
      `📈 <b>Get:</b> ~${tokensOut.toFixed(2)} ${sym}`,
      `💵 <b>Price:</b> $${q.priceUsd.toFixed(6)} per ${sym}`,
      `📊 <b>Impact (rough):</b> ~${roughImpactPct.toFixed(2)}%`,
      `💧 <b>Liquidity:</b> $${q.liquidityUsd.toLocaleString()}`,
      `📅 <b>Volume 24h:</b> $${q.volume24hUsd.toLocaleString()}`,
      ``,
      `⚡ To execute: /swap ${tokIn} ${amountSOL}`,
      ``,
      `<i>Data via Dexscreener</i>`,
    ].join("\n");

    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      loading.message_id,
      undefined,
      lines,
      { parse_mode: "HTML" }
    );
  } catch (e: any) {
    await ctx.reply(e?.message || "Could not get a quote right now.");
  }
});


  

  /**
   * /swap command - Execute a token swap
   * 
   * Usage: /swap <tokenSymbolOrMint> <amountSOL>
   * Example: /swap USDC 0.5
   * 
   * Immediately executes the swap (mock) and returns a transaction ID.
   * Future enhancement: Add inline confirmation/cancel buttons (PR5).
   */
  bot.command("swap", async (ctx) => {
    try {
      // Parse command arguments: /swap TOKEN AMOUNT
      // Type-safe way to access message text in command context
      const messageText = (ctx.message as Message.TextMessage).text;
      const parts = messageText?.split(" ").slice(1) || [];
      const [tokenRaw, amountRaw] = parts;
      
      // Validate that both token and amount were provided
      if (!tokenRaw || !amountRaw) {
        return ctx.reply("Usage: /swap <mintOrSymbol> <amountSOL>\nExample: /swap USDC 0.5");
      }
      
      // Prevent excessively long token inputs (security measure)
      if (tokenRaw.length > MAX_TOKEN_INPUT_LEN) {
        return ctx.reply("Token input is too long. Please provide a symbol like USDC or a valid mint address.");
      }
      
      // Parse and validate the SOL amount
      const amountSOL = Number(amountRaw);
      if (!Number.isFinite(amountSOL) || amountSOL <= 0) {
        return ctx.reply("Amount must be a number greater than 0.");
      }

      // Get or create user's wallet and retrieve wallet ID
      const { walletId } = await walletSvc.getOrCreateUserWallet(String(ctx.from!.id));

      // Execute the swap (currently mocked)
      const res = await swapSvc.swap({ outToken: tokenRaw, amountSOL, walletId });
      
      // Confirm swap completion with transaction ID
      await ctx.reply(`Swap complete (mock): tx ${res.txId}`);
    } catch (e: any) {
      // Handle any errors during swap execution
      await ctx.reply(e?.message || "Swap failed to start.");
    }
  });

  /**
   * Paste-to-swap helper - Auto-detect token symbols/addresses
   * 
   * When a user sends a plain text message that looks like a token symbol
   * (e.g., "USDC") or mint address, the bot suggests relevant commands.
   * 
   * Detection heuristics:
   * - Symbol: 3-6 uppercase/lowercase letters (e.g., USDC, SOL, BONK)
   * - Mint: 32-44 character base58 string (Solana address format)
   * 
   * Ignored:
   * - Messages starting with "/" (commands)
   * - Messages that don't match token patterns
   */
  bot.on(message('text'), async (ctx) => {
    // Get the message text and trim whitespace
    // ctx.message.text is already typed correctly by the message('text') filter
    const text = ctx.message.text.trim();
    
    // Ignore commands (start with /) and empty messages
    if (!text || text.startsWith("/")) return;

    // Check if text matches token symbol pattern (3-6 letters)
    const looksLikeSymbol = /^[A-Za-z]{3,6}$/.test(text);
    
    // Check if text matches Solana mint address pattern (base58, 32-44 chars)
    const looksLikeMint = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text);

    // If it doesn't look like a token, ignore it
    if (!(looksLikeSymbol || looksLikeMint)) return;
    
    // Enforce max length to prevent abuse
    if (text.length > MAX_TOKEN_INPUT_LEN) return;

    // Suggest relevant commands to the user
    await ctx.reply(
      [
        `Detected token: ${text}`,
        `Try:`,
        `• /quote ${text} 0.5`,
        `• /swap ${text} 0.5`,
      ].join("\n")
    );
  });
}