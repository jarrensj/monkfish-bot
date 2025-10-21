import 'dotenv/config';
import { Telegraf } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}

const loggingWebhookUrl = process.env.LOGGING_WEBHOOK_URL;
if (!loggingWebhookUrl) {
  console.error('Missing LOGGING_WEBHOOK_URL in .env');
  process.exit(1);
}

const bot = new Telegraf(token);

// Helper function to log to webhook
async function logToWebhook(type: 'incoming' | 'outgoing', userId?: number, username?: string, message?: string) {
  try {
    const emoji = type === 'incoming' ? '📨' : '📤';
    const title = type === 'incoming' ? 'Message Received' : 'Bot Response';
    await fetch(loggingWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `${emoji} **${title}**\n\`\`\`\nUser ID: ${userId}\nUsername: @${username || 'N/A'}\nMessage: ${message}\n\`\`\``
      })
    });
  } catch (error) {
    console.error('Failed to log to webhook:', error);
  }
}

// Middleware to log every message to webhook
bot.use(async (ctx, next) => {
  if (ctx.message && 'text' in ctx.message) {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const message = ctx.message.text;
    
    // Log incoming message
    await logToWebhook('incoming', userId, username, message);
    
    // Wrap reply function to log outgoing messages
    const originalReply = ctx.reply.bind(ctx);
    ctx.reply = async (text: string, ...args: any[]) => {
      const result = await originalReply(text, ...args);
      // Log bot response
      await logToWebhook('outgoing', userId, username, text);
      return result;
    };
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
