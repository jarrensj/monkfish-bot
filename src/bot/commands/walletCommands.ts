// Wallet-related bot commands (start, deposit, balance) — koiApi (jwt_user) only

import type { Telegraf, Context } from "telegraf";
import { logErr } from "./utils";
import { userDb } from "../../infra/database";
import { koiApi } from "../../clients";

type Bot = Telegraf<Context>;
const CURRENT_TOS_VERSION = "1.0.0-beta";

async function needsTosAcceptance(tgId: string): Promise<boolean> {
  try {
    return await userDb.needsTosAcceptance(tgId, CURRENT_TOS_VERSION);
  } catch (err) {
    console.error("[walletCommands] needsTosAcceptance error:", err);
    return true;
  }
}

export function registerWalletCommands(bot: Bot) {
  bot.start(async (ctx) => {
    const tg = String(ctx.from!.id);
    const needs = await needsTosAcceptance(tg);
    if (!needs) {
      await ctx.reply(
        [
          "Welcome back to Monkfish 🐟",
          "",
          "Commands:",
          "• /startwallet — Create/view your wallet",
          "• /deposit — View deposit address",
          "• /balance — Check your balance",
        ].join("\n"),
        { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
      );
      return;
    }

    const user = await userDb.getUser(tg).catch(() => null);
    const isUpdate = !!(user && user.tos_version && user.tos_version !== CURRENT_TOS_VERSION);
    const greeting = isUpdate ? "📋 <b>Our Terms of Service have been updated!</b>\n\n" : "Welcome to Monkfish 🐟\n\n";
    await ctx.reply(
      [
        greeting,
        "Before you begin, please review our Terms of Service:",
        "",
        "• This is a non-custodial wallet bot",
        "• You are responsible for your funds",
        "• Transactions are irreversible",
        "• Use at your own risk",
        "",
        "Reply with: <code>/tos-accept</code> to continue, or <code>/cancel</code> to exit.",
      ].join("\n"),
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
    );
  });

  bot.command("cancel", async (ctx) => {
    await ctx.reply("Okay. You can return anytime with <code>/start</code>.", { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
  });

  // Create/view wallet via backend
  bot.command("startwallet", async (ctx) => {
    try {
      const tg = String(ctx.from!.id);
      if (await needsTosAcceptance(tg)) {
        await ctx.reply("Please accept the current Terms of Service first. Use <code>/start</code> to begin.", { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
        return;
      }

      // Create (idempotent on backend) or ensure wallet exists
      const created = await koiApi.walletCreate({ userId: tg, command: "wallet", traceId: String(ctx.message!.message_id) });
      // Get deposit address (default chain can be made dynamic later)
      const dep = await koiApi.walletDepositAddress("sol", { userId: tg, command: "wallet", traceId: String(ctx.message!.message_id) });

      await ctx.reply(
        [
          "🐟 <b>Your Monkfish wallet is ready!</b>",
          "",
          "Deposit address:",
          `<code>${dep.address}</code>`,
          "",
          "Commands:",
          "• /deposit — View deposit address again",
          "• /balance — Check your balance",
        ].join("\n"),
        { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
      );
    } catch (err) {
      logErr("Wallet create/view failed", err, { tg: String(ctx.from!.id) });
      await ctx.reply("❌ <b>Something went wrong</b> setting up your wallet. Please try again.", { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    }
  });

  bot.command("deposit", async (ctx) => {
    try {
      const tg = String(ctx.from!.id);
      if (await needsTosAcceptance(tg)) {
        await ctx.reply("Please accept the current Terms of Service first. Use <code>/start</code> to begin.", { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
        return;
      }
      const dep = await koiApi.walletDepositAddress("sol", { userId: tg, command: "wallet", traceId: String(ctx.message!.message_id) });
      await ctx.reply(
        ["<b>Deposit address</b>", `<code>${dep.address}</code>`, "", "Send SOL here to fund your wallet."].join("\n"),
        { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
      );
    } catch (err) {
      logErr("Deposit fetch failed", err, { tg: String(ctx.from!.id) });
      await ctx.reply("❌ <b>Couldn't fetch your deposit address.</b> Try again shortly.", { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    }
  });

  bot.command("balance", async (ctx) => {
    try {
      const tg = String(ctx.from!.id);
      if (await needsTosAcceptance(tg)) {
        await ctx.reply("Please accept the current Terms of Service first. Use <code>/start</code> to begin.", { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
        return;
      }
      const resp = await koiApi.walletBalance({ userId: tg, command: "wallet", traceId: String(ctx.message!.message_id) });
      if (!resp?.ok) {
        await ctx.reply("❌ <b>Couldn't fetch your balance.</b> Please try again.", { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
        return;
      }
      const lines: string[] = ["💰 <b>Your wallet balances</b>"];
      if (Array.isArray(resp.balances) && resp.balances.length) {
        for (const b of resp.balances) {
          lines.push(`• ${b.symbol || "?"} (${b.chain || "?"}): <code>${b.amount ?? "0"}</code>`);
        }
      } else {
        lines.push("• <i>No assets found</i>");
      }
      await ctx.reply(lines.join("\n"), { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    } catch (err) {
      logErr("Balance failed", err, { tg: String(ctx.from!.id) });
      await ctx.reply("❌ <b>Couldn't fetch your balance</b>. Please try again shortly.", { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    }
  });
  
}
