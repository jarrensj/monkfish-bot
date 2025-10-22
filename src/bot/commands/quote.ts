import type { Telegraf } from "telegraf";
import type { Message } from "telegraf/types";
import { makeSwapService } from "../../core/services/swap";
import { makeWalletService } from "../../core/services/wallet";


/**
 * Registers the /quote command for getting token swap price quotes
 * 
 * Usage: /quote <tokenSymbolOrMint> <amountSOL>
 * Example: /quote USDC 0.5
 */
export function registerQuoteCommand(bot: Telegraf) {
  const swap = makeSwapService();
  const wallet = makeWalletService();

  bot.command("quote", async (ctx) => {
    try {
      // Type-safe way to access message text
      const message = ctx.message as Message.TextMessage;
      const parts = message.text?.split(" ").slice(1);
      const [tokenRaw, amountRaw] = parts || [];
      
      // Validate required parameters
      if (!tokenRaw || !amountRaw) {
        return ctx.reply("Usage: /quote <mintOrSymbol> <amountSOL>\nExample: /quote USDC 0.5");
      }
      
      // Parse and validate amount
      const amountSOL = Number(amountRaw);
      if (!(amountSOL > 0)) {
        return ctx.reply("Amount must be > 0.");
      }

      // Ensure user has a wallet (required for quote service)
      await wallet.getOrCreateUserWallet(String(ctx.from!.id));

      // Fetch quote from swap service
      const q = await swap.quote({ outToken: tokenRaw, amountSOL });
      
      // Format and send quote response
      await ctx.reply(
        [
          `Quote (mock)`,
          `Spend: ${q.amountSOL} SOL`,
          `Get:   ~${q.estimatedOut.toFixed(2)} ${q.outSymbol}`,
          `Impact: ~${q.priceImpactPct.toFixed(2)}%`,
          q.routeNote ? `Route: ${q.routeNote}` : "",
          "",
          `To execute: /swap ${tokenRaw} ${amountSOL}`,
        ].filter(Boolean).join("\n")
      );
    } catch (e: any) {
      await ctx.reply(e?.message || "Could not get a quote right now.");
    }
  });
}