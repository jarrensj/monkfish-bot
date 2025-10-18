import { Telegraf } from 'telegraf';

export function registerHelp(bot: Telegraf) {
  bot.command('help', async (ctx) => {
    await ctx.reply([
      'Commands:',
      '/start – create/attach your wallet (coming soon)',
      '/available_algos – list strategies you can enable',
      // soon: /enable <algo> <amount>, /disable <algo>, /deposit, /balance, /allocations
    ].join('\n'));
  });
}
