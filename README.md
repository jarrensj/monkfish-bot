# monkfish-bot

Telegram bot for toggling koi-fish algos and managing allocations.

## Quick Start
1. Set up Supabase database
2. Create `.env` file with required credentials:
   - `TELEGRAM_BOT_TOKEN` — Bot token from [BotFather](https://t.me/botfather)
   - `SUPABASE_URL` — Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — Your Supabase service role key (⚠️ keep secret!)
3. Run the database migration from `migrations/001_initial_schema.sql`
4. `npm install`
5. `npm run dev`


## Environment Variables

### Required
- `TELEGRAM_BOT_TOKEN` — Bot token from [BotFather](https://t.me/botfather) on Telegram
- `SUPABASE_URL` — Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Your Supabase service role key (backend only, keep secret!)

### Optional
- `KOI_API_URL` — koi-fish API base URL (default: `http://localhost:3001`)
- `LOGGING_WEBHOOK_URL` — Webhook URL for message logging
