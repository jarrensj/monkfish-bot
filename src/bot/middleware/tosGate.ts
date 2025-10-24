import type { Context } from "telegraf";
import { userDb } from "../../infra/database";
import { logErr } from "../commands/utils/errLog";

const CURRENT_TOS_VERSION = "v1";

export async function ensureTosAccepted(ctx: Context): Promise<boolean> {
  try {
    const tgId = ctx.from?.id ? String(ctx.from.id) : null;
    if (!tgId) return true; // nothing we can do

    const needs = await userDb.needsTosAcceptance(tgId, CURRENT_TOS_VERSION);
    if (!needs) return true;

    // HTML-only prompt
    await ctx.reply(
      [
        "📜 <b>Terms of Service</b>",
        "To proceed, please accept the latest ToS.",
        "",
        "Reply with: <code>/tos-accept</code>",
      ].join("\n"),
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
    );
    return false;
  } catch (e: any) {
    logErr("middleware.ensureTosAccepted", e, { from: ctx.from?.id });
    // Fail closed (block actions) to be safe
    await ctx.reply(
      "❌ <b>Service unavailable</b><br/>Please try again shortly.",
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
    );
    return false;
  }
}