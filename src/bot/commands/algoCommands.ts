import type { Telegraf, Context } from "telegraf";
import { koiApi } from "../../clients";              // jwt_user client
import { logErr } from "./utils/errLog";                  // your structured logger
import { ensureTosAccepted } from "../middleware/tosGate"; // ToS guard (HTML replies)

type Bot = Telegraf<Context>;

function parseAmountSOL(raw?: string): number | null {
  if (!raw) return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}

export function registerAlgoCommands(bot: Bot) {
  // List available algos
  bot.command("algos", async (ctx) => {
    try {
      if (!(await ensureTosAccepted(ctx))) return;
      const tg = String(ctx.from!.id);
      const res = await koiApi.algosList({ userId: tg, command: "algos", traceId: String(ctx.message!.message_id) });

      const lines: string[] = ["🤖 <b>Available Algos</b>"];
      if (Array.isArray(res?.algos) && res.algos.length) {
        for (const a of res.algos) {
          lines.push(`• <b>${a.id}</b> — ${a.name} <i>(${a.status})</i>`);
        }
        lines.push(
          "",
          "Enable one with:",
          "<code>/algo_enable KOI_TREND 2.0</code>",
          "Disable with:",
          "<code>/algo_disable KOI_TREND 2.0</code>"
        );
      } else {
        lines.push("<i>No algos available.</i>");
      }

      await ctx.reply(lines.join("\n"), { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    } catch (e) {
      logErr("algos.list", e, { from: ctx.from?.id });
      await ctx.reply("❌ <b>Could not fetch algos.</b> Please try again.", { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    }
  });

  // Show current allocations for this user
  bot.command("allocations", async (ctx) => {
    try {
      if (!(await ensureTosAccepted(ctx))) return;
      const tg = String(ctx.from!.id);
      const res = await koiApi.allocationsGet({ userId: tg, command: "allocations", traceId: String(ctx.message!.message_id) });

      const lines: string[] = ["📊 <b>Your Allocations</b>"];
      if (Array.isArray(res?.allocations) && res.allocations.length) {
        for (const al of res.allocations) {
          lines.push(`• <b>${al.algoId}</b>: <code>${al.percent}%</code>`);
        }
      } else {
        lines.push("<i>No active allocations.</i>");
      }

      await ctx.reply(lines.join("\n"), { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    } catch (e) {
      logErr("allocations.get", e, { from: ctx.from?.id });
      await ctx.reply("❌ <b>Could not fetch your allocations.</b>", { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    }
  });

  // Enable an algo with amount in SOL
  // Usage: /algo_enable KOI_TREND 2.0
  bot.command("algo_enable", async (ctx) => {
    try {
      if (!(await ensureTosAccepted(ctx))) return;
      const tg = String(ctx.from!.id);
      const parts = ctx.message!.text.trim().split(/\s+/);
      const algoId = parts[1];
      const amount = parseAmountSOL(parts[2]);

      if (!algoId || amount == null) {
        await ctx.reply(
          "Usage: <code>/algo_enable &lt;ALGO_CODE&gt; &lt;amountSOL&gt;</code>\nExample: <code>/algo_enable KOI_TREND 2.0</code>",
          { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
        );
        return;
      }

      const r = await koiApi.allocationsEnable({ algoId, amountSol: amount }, { userId: tg, command: "allocations", traceId: String(ctx.message!.message_id) });

      // Backend may return fields like { allocationId, algoCode, status }
      await ctx.reply(
        [
          "✅ <b>Algo enabled</b>",
          `• Algo: <b>${algoId}</b>`,
          `• Amount: <code>${amount}</code> SOL`,
          r && (r as any).status ? `• Status: <i>${(r as any).status}</i>` : "",
        ].filter(Boolean).join("\n"),
        { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
      );
    } catch (e) {
      logErr("allocations.enable", e, { from: ctx.from?.id });
      await ctx.reply("❌ <b>Could not enable the algo.</b> Please try again.", { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    }
  });

  // Disable an algo with amount in SOL (match your backend test shape)
  // Usage: /algo_disable KOI_TREND 2.0
  bot.command("algo_disable", async (ctx) => {
    try {
      if (!(await ensureTosAccepted(ctx))) return;
      const tg = String(ctx.from!.id);
      const parts = ctx.message!.text.trim().split(/\s+/);
      const algoId = parts[1];
      const amount = parseAmountSOL(parts[2]);

      if (!algoId || amount == null) {
        await ctx.reply(
          "Usage: <code>/algo_disable &lt;ALGO_CODE&gt; &lt;amountSOL&gt;</code>\nExample: <code>/algo_disable KOI_TREND 2.0</code>",
          { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
        );
        return;
      }

      const r = await koiApi.allocationsDisable({ algoId, amountSol: amount }, { userId: tg, command: "allocations", traceId: String(ctx.message!.message_id) });

      await ctx.reply(
        [
          "🛑 <b>Algo disabled</b>",
          `• Algo: <b>${algoId}</b>`,
          `• Amount: <code>${amount}</code> SOL`,
          r && (r as any).status ? `• Status: <i>${(r as any).status}</i>` : "",
        ].filter(Boolean).join("\n"),
        { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
      );
    } catch (e) {
      logErr("allocations.disable", e, { from: ctx.from?.id });
      await ctx.reply("❌ <b>Could not disable the algo.</b> Please try again.", { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    }
  });
}