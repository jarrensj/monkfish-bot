// Utility bot commands (ping, echo, etc.)
import type { Telegraf, Context } from "telegraf";
// If this import errors in your version, see note below to switch to 'typegram'.
import type { Message } from "telegraf/types";

type Bot = Telegraf<Context>;

export function registerUtilCommands(bot: Bot) {
  // Health check
  bot.command("ping", (ctx) => ctx.reply("pong"));

  // Echo (type-safe, no `any`, no NarrowedContext)
  bot.command("echo", (ctx) => {
    if (!isTextMessage(ctx)) return; // ignore non-text updates
    const [, ...rest] = ctx.message.text.trim().split(/\s+/);
    return ctx.reply(rest.join(" ") || "…");
  });
}

/** Narrows ctx.message to a TextMessage so we can safely read ctx.message.text */
function isTextMessage(ctx: Context): ctx is Context & { message: Message.TextMessage } {
  return ctx.updateType === "message" && !!ctx.message && "text" in ctx.message;
}

export type LogMeta = Record<string, unknown>;

export function logErr(label: string, err: unknown, meta: LogMeta = {}): void {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(
    JSON.stringify({
      level: "error",
      label,
      name: e.name,
      message: e.message,
      stack: e.stack,
      meta,
      ts: new Date().toISOString(),
      env: process.env.NODE_ENV ?? "development",
    })
  );
}
