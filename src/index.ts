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
const LOGGING_WEBHOOK_URL: string = loggingWebhookUrl;

const bot = new Telegraf(token);

// Helper function to log to webhook
async function logToWebhook(type: 'incoming' | 'outgoing', userId?: number, username?: string, message?: string) {
  try {
    const emoji = type === 'incoming' ? '📨' : '📤';
    const title = type === 'incoming' ? 'Message Received' : 'Bot Response';
    await fetch(LOGGING_WEBHOOK_URL, {
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
  if (ctx.message) {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    let messageInfo: string | null = null;
    
    // Handle text messages
    if ('text' in ctx.message) {
      messageInfo = ctx.message.text;
      
      // Wrap reply function to log outgoing messages
      const originalReply = ctx.reply.bind(ctx);
      ctx.reply = async (text: string, ...args: any[]) => {
        const result = await originalReply(text, ...args);
        // Log bot response
        await logToWebhook('outgoing', userId, username, text);
        return result;
      };
    }
    // Handle stickers
    else if ('sticker' in ctx.message) {
      const sticker = ctx.message.sticker;
      messageInfo = `[STICKER] ${sticker.emoji || '🎨'} from set: ${sticker.set_name || 'unknown'}`;
    }
    // Handle animations (GIFs)
    else if ('animation' in ctx.message) {
      const animation = ctx.message.animation;
      messageInfo = `[GIF] ${animation.file_name || 'animation'} (${animation.width}x${animation.height}, ${Math.round(animation.file_size! / 1024)}KB)`;
    }
    // Handle photos
    else if ('photo' in ctx.message) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Get highest resolution
      const caption = ctx.message.caption ? ` - Caption: ${ctx.message.caption}` : '';
      messageInfo = `[PHOTO] ${photo.width}x${photo.height} (${Math.round(photo.file_size! / 1024)}KB)${caption}`;
    }
    // Handle videos
    else if ('video' in ctx.message) {
      const video = ctx.message.video;
      const caption = ctx.message.caption ? ` - Caption: ${ctx.message.caption}` : '';
      messageInfo = `[VIDEO] ${video.file_name || 'video'} (${video.width}x${video.height}, ${video.duration}s, ${Math.round(video.file_size! / 1024)}KB)${caption}`;
    }
    // Handle video notes (circular videos)
    else if ('video_note' in ctx.message) {
      const videoNote = ctx.message.video_note;
      messageInfo = `[VIDEO NOTE] ${videoNote.duration}s (${Math.round(videoNote.file_size! / 1024)}KB)`;
    }
    // Handle voice messages
    else if ('voice' in ctx.message) {
      const voice = ctx.message.voice;
      messageInfo = `[VOICE] ${voice.duration}s (${Math.round(voice.file_size! / 1024)}KB)`;
    }
    // Handle audio files
    else if ('audio' in ctx.message) {
      const audio = ctx.message.audio;
      const title = audio.title || audio.file_name || 'audio';
      const performer = audio.performer ? ` by ${audio.performer}` : '';
      messageInfo = `[AUDIO] ${title}${performer} (${audio.duration}s, ${Math.round(audio.file_size! / 1024)}KB)`;
    }
    // Handle documents
    else if ('document' in ctx.message) {
      const document = ctx.message.document;
      const caption = ctx.message.caption ? ` - Caption: ${ctx.message.caption}` : '';
      messageInfo = `[DOCUMENT] ${document.file_name || 'file'} (${Math.round(document.file_size! / 1024)}KB)${caption}`;
    }
    // Handle locations
    else if ('location' in ctx.message) {
      const location = ctx.message.location;
      messageInfo = `[LOCATION] Lat: ${location.latitude}, Lon: ${location.longitude}`;
    }
    // Handle contacts
    else if ('contact' in ctx.message) {
      const contact = ctx.message.contact;
      messageInfo = `[CONTACT] ${contact.first_name} ${contact.last_name || ''} - ${contact.phone_number}`;
    }
    // Handle polls
    else if ('poll' in ctx.message) {
      const poll = ctx.message.poll;
      const options = poll.options.map(o => o.text).join(', ');
      messageInfo = `[POLL] ${poll.question} - Options: ${options}`;
    }
    // Handle dice
    else if ('dice' in ctx.message) {
      const dice = ctx.message.dice;
      messageInfo = `[DICE] ${dice.emoji} rolled ${dice.value}`;
    }
    
    // Log the message if we captured any info
    if (messageInfo) {
      await logToWebhook('incoming', userId, username, messageInfo);
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
