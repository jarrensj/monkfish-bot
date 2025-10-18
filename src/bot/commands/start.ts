import { Telegraf } from 'telegraf';

export function registerStart(bot: Telegraf) {
  bot.start(async (ctx) => {
    const name = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || 'there';
    await ctx.reply(`Welcome, ${name}! 🐟 Monkfish is getting your account ready.\n\nTry /available_algos to see what you can run.`);
  });
}
