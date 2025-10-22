import type { Telegraf, Context } from "telegraf";
import type { Message } from "telegraf/types";


type Bot = Telegraf<Context>;

export function registerUtilCommands(bot: Bot) {
  bot.command("ping", (ctx) => ctx.reply("pong"));

  bot.command("echo", (ctx) => {
    if (!isTextMessage(ctx)) return;
    const [, ...rest] = ctx.message.text.trim().split(/\s+/);
    return ctx.reply(rest.join(" ") || "…");
  });
}


export function isTextMessage(
  ctx: Context
): ctx is Context & { message: Message.TextMessage } {
  return ctx.updateType === "message" && !!ctx.message && "text" in ctx.message;
}

export type LogMeta = Record<string, unknown>;

export function logErr(label: string, err: unknown, meta: LogMeta = {}): void {
  const e = err instanceof Error ? err : new Error(String(err));
  // Keep logs structured and redaction-friendly
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


// Input guards & formatters

/** Solana mint format (base58, 32–44 chars) */
export const looksLikeMint = (s: string) =>
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);

/** Token symbol heuristic (2–10 letters) */
export const looksLikeSymbol = (s: string) => /^[A-Za-z]{2,10}$/.test(s);

/** Escape minimal HTML for Telegram parse_mode: "HTML" */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}

/** Simple per-key cooldown to avoid spammy calls */
const lastCall = new Map<string, number>();
export function underCooldown(key: string, ms = 1500): boolean {
  const now = Date.now();
  const last = lastCall.get(key) ?? 0;
  if (now - last < ms) return true;
  lastCall.set(key, now);
  return false;
}

/** Clamp a numeric string to N decimals and validate > 0 */
export function parsePositiveAmount(input: string, maxDecimals = 9): number | null {
  if (!/^\d+(\.\d+)?$/.test(input)) return null;
  const [iq, id] = input.split(".");
  if (id && id.length > maxDecimals) return null;
  const n = Number(input);
  return n > 0 ? n : null;
}

/** Format number with fixed decimals, trimming trailing zeros */
export function formatAmount(n: number, decimals = 4): string {
  return Number.isFinite(n) ? Number(n.toFixed(decimals)).toString() : "0";
}
