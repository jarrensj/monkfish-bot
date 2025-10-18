# monkfish-bot

Telegram bot frontend for toggling koi-fish algos and managing allocations.

## Quick Start
1. `cp .env.example .env` and set `TELEGRAM_BOT_TOKEN`.
2. `npm run dev` (or `npm run start` in prod).
3. Hit `http://localhost:3000/health` to verify.
4. In Telegram, send `/start` then `/available_algos`.

## Env
- `TELEGRAM_BOT_TOKEN` — Bot token from @BotFather
- `KOI_API_URL` — Base URL to koi-fish API (optional during mock)
- `PORT` — Health HTTP port (default 3000)

## Commands
- `/help` — show commands
- `/start` — greet + setup
- `/available_algos` — list strategies (mocked until koi-fish is ready)
