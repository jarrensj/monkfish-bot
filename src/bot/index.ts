import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { env } from '../infra/env';
import { log } from '../infra/logger';
import { errorBoundary } from './middlewares/errorBoundary';
import { registerHelp } from './commands/help';
import { registerStart } from './commands/start';
import { registerAvailableAlgos } from './commands/available_algos';

export async function startBot() {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  bot.use(errorBoundary);
  registerHelp(bot);
  registerStart(bot);
  registerAvailableAlgos(bot);

  await bot.launch();
  log.info('Monkfish bot launched (long-poll).');
  // Graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
