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

export type LogMeta = Record<string, unknown>;

export function logErr(label: string, err: unknown, meta: LogMeta = {}): void {
  const isError = err instanceof Error;
  const message = isError ? err.message : String(err);
  const stack = isError ? err.stack : undefined;

  console.error(
    JSON.stringify({
      level: "error",
      label,
      message,
      stack,
      meta,
      ts: new Date().toISOString(),
      env: process.env.NODE_ENV || "development",
    })
  );
}