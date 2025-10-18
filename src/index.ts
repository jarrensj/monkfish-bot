import 'dotenv/config';
import { Telegraf } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}

const bot = new Telegraf(token);

bot.start((ctx) => ctx.reply('Monkfish bot ready. Try /echo hello'));
bot.command('echo', (ctx) => {
  const text = (ctx.message as any).text?.split(' ').slice(1).join(' ') || '…';
  return ctx.reply(text);
});

bot.launch().then(() => console.log('Bot launched'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
