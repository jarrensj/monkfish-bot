import { Telegraf } from 'telegraf';
import { listAlgos } from '../../core/services/koi.client';

export function registerAvailableAlgos(bot: Telegraf) {
  bot.command('available_algos', async (ctx) => {
    const algos = await listAlgos();
    if (!algos?.length) return ctx.reply('No algos available yet.');
    const lines = algos.map((a: any) => `• ${a.id} — ${a.name} (min ${a.minAllocSOL} SOL)`);
    await ctx.reply(lines.join('\n'));
  });
}
