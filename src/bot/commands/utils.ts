// Utility bot commands (ping, echo, etc.)
import type { Context } from "telegraf";

export function registerUtilCommands(bot: any) {
  // Health check command
  bot.command("ping", (ctx: Context) => ctx.reply("pong"));

  // Simple echo command for testing
  bot.command("echo", (ctx: Context) => {
    const text = (ctx.message as any).text?.split(" ").slice(1).join(" ") || "…";
    return ctx.reply(text);
  });
}