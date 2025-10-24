import type { Context, MiddlewareFn } from "telegraf";
import { userDb } from "../../infra/database";
import { logErr } from "../commands/utils/errLog";
import type { Message } from "telegraf/types";

/**
 * User Initialization Middleware
 * Ensures a user record exists for every Telegram user.
 * Does not enforce ToS acceptance—just maintains user records.
 */
export const userInit: MiddlewareFn<Context> = async (ctx, next) => {
    try {
        // Type-safe way to check for /ping command (skip DB for health checks)
        if (ctx.message && 'text' in ctx.message) {
            const text = (ctx.message as Message.TextMessage).text;
            if (/^\/ping\b/.test(text)) {
                return next();
            }
        }

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
        // Log but don't block the pipeline
        logErr("middleware.userInit", e, { from: ctx.from?.id });
    }

    // Always continue
    await next();
};
