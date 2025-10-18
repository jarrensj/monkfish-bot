import type { Context, MiddlewareFn } from 'telegraf';
import { log } from '../../infra/logger';

/**
 * Error boundary middleware that catches and logs unhandled errors in bot commands.
 * Prevents the bot from crashing and sends a user-friendly error message.
 */
export const errorBoundary: MiddlewareFn<Context> = async (ctx, next) => {
  try {
    await next();
  } catch (err: any) {
    log.error('Bot error', err?.message || err);
    try { await ctx.reply('⚠️ Oops, something went wrong. Please try again.'); } catch {}
  }
};
