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
import { underCooldown } from "./utils";

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

      // Show loading message with emoji
      const loadingMsg = await ctx.reply("🔍 Fetching real-time quote...");

      // Ensure user has a wallet (idempotent)
      await walletSvc.getOrCreateUserWallet(String(ctx.from!.id));

      // 🔁 Authoritative quote via service (mock now, REST later)
      const q = await swapSvc.quote({ outToken: tokenRaw, amountSOL });

      // OPTIONAL: If you still want dexscreener as extra context, keep it as a non-blocking try/catch
      // and label it "indicative only". Otherwise remove this whole block.
      // let extra = "";
      // try {
      //   const mint = looksLikeMint(tokenRaw) ? tokenRaw : await resolveMintSmart(tokenRaw);
      //   if (mint && looksLikeMint(mint)) {
      //     const pair = await getSolanaTokenPair(mint);
      //     const dx = pair ? toDexTokenQuote(pair) : null;
      //     if (dx) extra = `\n\n💡 *Indicative:* $${dx.priceUsd.toFixed(6)}/${dx.symbol} via DexScreener`;
      //   }
      // } catch { /* ignore */ }

      const lines = [
        "📊 *Real-Time Quote*",
        "",
        `💰 *Spend:* ${q.amountSOL} SOL`,
        `📈 *Get:* ~${q.estimatedOut.toFixed(4)} ${q.outSymbol}`,
        `📊 *Impact:* ~${q.priceImpactPct.toFixed(2)}%`,
        q.routeNote ? `🔀 *Route:* ${q.routeNote}` : "",
        "",
        `⚡ To execute: /swap ${tokenRaw} ${amountSOL}`,
        // extra, // <- if you kept the indicative bit
      ].filter(Boolean);
      
      // Edit the loading message with the quote results
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        loadingMsg.message_id,
        undefined,
        lines.join("\n"),
        { parse_mode: "Markdown" }
      );
    } catch (e: any) {
      await ctx.reply(e?.message || "Could not get a quote right now.");
    }
  });
  

  //  TODO: connect to Backend
  /**
   * /swap command - Execute a token swap
   * 
   *
   * Immediately executes the swap (mock) and returns a transaction ID.
   * Future enhancement: Add inline confirmation/cancel buttons (PR5).
   * 
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

  //  TODO: connect to Backend
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