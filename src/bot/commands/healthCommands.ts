import type { Telegraf, Context } from "telegraf";
import {
  isTextMessage
} from "./utils";


type Bot = Telegraf<Context>;

const KOI_API_URL = process.env.KOI_API_URL;

export function registerHealthCommands(bot: Bot) {

    // bot commands only
  bot.command("ping", (ctx) => ctx.reply("pong"));

  bot.command("echo", (ctx) => {
    if (!isTextMessage(ctx)) return;
    const [, ...rest] = ctx.message.text.trim().split(/\s+/);
    return ctx.reply(rest.join(" ") || "…");
  });

  // Route command /koifish – calls backend TG health route
  bot.command("koifish", async (ctx) => {
    try {
      const res = await fetch(`${KOI_API_URL}/api/tg/health`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return ctx.reply(`❌ tg-health ${res.status} ${text}`);
      }
      const koi = await res.json();
      const emoji = typeof koi?.status === "string" ? koi.status : (koi?.ok ? "🟢 healthy" : "🔴 down");

      return ctx.reply(
        [
          "🤖🐟 *TG Health*",
          `status: ${emoji}`,
          `service: ${koi?.service || "koi-fish"}`,
          `time: ${koi?.timestamp || "n/a"}`,
          `uptime: ${typeof koi?.uptimeSec === "number" ? koi.uptimeSec + "s" : "n/a"}`,
        ].join("\n"),
        { parse_mode: "Markdown" }
      );
    } catch (e: any) {
      return ctx.reply(`❌ tg-health error: ${e?.message || String(e)}`);
    }
  });

}