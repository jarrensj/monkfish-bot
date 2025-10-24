/**
 * Swap Commands (Solana-only)
 * - /swap <mint> <amountSOL>  → executes swap via backend Cadence route
 */

import type { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { makeSwapService } from "../../core/services/swap";
import { looksLikeMint, isTextMessage } from "./utils";

const MAX_TOKEN_INPUT_LEN = 64;
const swapSvc = makeSwapService();


function escHtml(s: string) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export function registerSwapCommands(bot: Telegraf) {
  // /swap <mint> <amountSOL>
  bot.command("swap", async (ctx) => {
    try {
      if (!isTextMessage(ctx)) return;
      const parts = ctx.message.text.trim().split(/\s+/);
      const mint = parts[1];
      const amountRaw = parts[2];

      if (!mint || !amountRaw) {
        return ctx.reply(
          "Usage: /swap <mint> <amountSOL>\nExample: /swap EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 0.05"
        );
      }
      if (mint.length > MAX_TOKEN_INPUT_LEN) return ctx.reply("Mint input is too long.");
      if (!looksLikeMint(mint)) return ctx.reply("Please provide a valid Solana mint address.");

      const amountSOL = Number(amountRaw);
      if (!Number.isFinite(amountSOL) || amountSOL <= 0) {
        return ctx.reply("Amount must be a number greater than 0.");
      }

      const loading = await ctx.reply("⚡ Executing swap…");
      const r = await swapSvc.swap({ mint, amountSOL });

      const link =
        r.txId && r.txId !== "DRY_RUN"
          ? `\n🔗 <a href="https://solscan.io/tx/${encodeURIComponent(r.txId)}">View on Solscan</a>`
          : "";

      const out = typeof r.estimatedOut === "number" ? r.estimatedOut.toFixed(6) : undefined;

      const html = [
        `✅ <b>Swap submitted!</b>`,
        `• tx: ${escHtml(r.txId)}`,
        out ? `• estOut: ~${escHtml(out)}` : "",
        link,
      ].filter(Boolean).join("\n");

      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        loading.message_id,
        undefined,
        html,
        { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
      );
    } catch (e: any) {
      await ctx.reply(
        `❌ <b>Swap failed</b>\n<code>${escHtml(e?.message || "unknown error")}</code>`,
        { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
      );
    }
  });

  // Optional: minimal autosuggest (kept; Sol-only)
  bot.on(message("text"), async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text || text.startsWith("/")) return;

    const looksLikeSymbol = /^[A-Za-z]{3,6}$/.test(text);
    const isMint = looksLikeMint(text);
    if (!(looksLikeSymbol || isMint)) return;
    if (text.length > MAX_TOKEN_INPUT_LEN) return;

    await ctx.reply(
      [
        `Detected token input: ${escHtml(text)}`,
        `Try:`,
        `• /swap ${escHtml(text)} 0.05`,
        looksLikeSymbol ? `\nNote: use the <b>mint address</b>, not the symbol.` : "",
      ].join("\n"),
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
    );
  });
}
