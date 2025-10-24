import type { Telegraf, Context, MiddlewareFn } from "telegraf";
import { userDb } from "../../infra/database";
import { logErr } from "./utils/errLog";


const TOS_VERSION = "v1";

/**
 * Terms of Service Commands
 * 
 * Handles ToS acceptance flow:
 * - /tos-accept or /agree: Accept terms and unlock bot features
 * - After acceptance, users can create wallets and use trading commands
 */
export function registerTosCommands(bot: Telegraf<Context>) {
    const accept: MiddlewareFn<Context> = async (ctx) => {
        try {
            const tgId = ctx.from?.id ? String(ctx.from.id) : null;
            if (!tgId) return;

            // Fallback ensure user row (in case userInit didn't run yet)
            await userDb.upsertUser({
                telegram_id: tgId,
                tos_agreed: false,
                tos_version: null,
                tos_agreed_at: null,
            });

            const nowIso = new Date().toISOString();
            await userDb.updateTosAcceptance(tgId, TOS_VERSION, nowIso);

            await ctx.reply(
                "✅ <b>ToS accepted!</b>\n\n" +
                "You can now:\n" +
                "• Create a wallet with <code>/startwallet</code>\n" +
                "• Get price quotes with <code>/quote</code>\n" +
                "• Execute swaps with <code>/swap</code>",
                { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
            );
        } catch (e) {
            logErr("tos.accept", e, { from: ctx.from?.id });
            const msg =
                (e as any)?.code === "42501"
                    ? "❌ <b>ToS update blocked by RLS.</b> Ensure the bot is using the Supabase service-role key."
                    : "❌ <b>Something went wrong</b> accepting ToS. Please try again.";
            await ctx.reply(msg, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
        }
    };

    bot.command("tos-accept", accept);
    bot.command("agree", accept); // alias lives here not in wallet commands
}