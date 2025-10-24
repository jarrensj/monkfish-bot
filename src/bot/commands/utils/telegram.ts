import type { Context } from "telegraf";
import type { Message } from "telegraf/types";

/** Type guard for text messages */
export function isTextMessage(
  ctx: Context
): ctx is Context & { message: Message.TextMessage } {
  return ctx.updateType === "message" && !!ctx.message && "text" in ctx.message;
}

/** Reply with HTML (always sets parse_mode: "HTML") */
export function replyHTML(ctx: Context, html: string) {
  return (ctx as any).reply(html, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}

/** Edit a prior message to new HTML (HTML parse mode enforced) */
export function editHTML(ctx: Context, messageId: number, html: string) {
  return ctx.telegram.editMessageText(
    (ctx as any).chat!.id,
    messageId,
    undefined,
    html,
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
  );
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