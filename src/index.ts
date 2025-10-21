import 'dotenv/config';
import { Telegraf } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
if (!webhookUrl) {
  console.error('Missing DISCORD_WEBHOOK_URL in .env');
  process.exit(1);
}

const bot = new Telegraf(token);

// Middleware to log every message to webhook
bot.use(async (ctx, next) => {
  if (ctx.message && 'text' in ctx.message) {
    const userId = ctx.from?.id;
    const username = ctx.from?.username || 'N/A';
    const message = ctx.message.text;
    
    // Log to webhook
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `**New Message Received**\n\`\`\`\nUser ID: ${userId}\nUsername: @${username}\nMessage: ${message}\n\`\`\``
        })
      });
    } catch (error) {
      console.error('Failed to log to webhook:', error);
    }
  }
  
  return next();
});

bot.start((ctx) => ctx.reply('Monkfish bot ready. Try /echo hello'));
bot.command('echo', (ctx) => {
  const text = (ctx.message as any).text?.split(' ').slice(1).join(' ') || '…';
  return ctx.reply(text);
});

bot.launch().then(() => console.log('Bot launched'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
