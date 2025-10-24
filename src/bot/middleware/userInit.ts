// src/bot/middleware/userInit.ts
import type { Context, MiddlewareFn } from "telegraf";
import { userDb } from "../../infra/database";
import { logErr } from "../commands/utils/errLog";

const PUBLIC_CMDS = new Set(["help", "commands", "ping"]);

function getCommand(ctx: Context): string | null {
  const m: any = (ctx as any).message;
  if (!m || typeof m.text !== "string") return null;
  const t = m.text.trim();
  if (!t.startsWith("/")) return null;
  // "/help@YourBot" -> "help"
  const raw = t.slice(1).split(/\s+/)[0] || "";
  return raw.split("@")[0].toLowerCase();
}

export const userInit: MiddlewareFn<Context> = async (ctx, next) => {
  // Let public commands pass without DB upsert (no RLS noise)
  const cmd = getCommand(ctx);
  if (cmd && PUBLIC_CMDS.has(cmd)) {
    return next();
  }

  try {
    const tgId = ctx.from?.id ? String(ctx.from.id) : null;
    if (tgId) {
      await userDb.upsertUser({
        telegram_id: tgId,
        tos_agreed: false,
        tos_version: null,
        tos_agreed_at: null,
      });
    }
  } catch (e: any) {
    // Don’t block — just log and continue (helps when env still has anon key)
    logErr("middleware.userInit", e, { from: ctx.from?.id });
  }

  await next();
};
