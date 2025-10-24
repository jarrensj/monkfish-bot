# Migration Guide: keyValue.json → Supabase

This guide helps you migrate existing data from the old `keyValue.json` file to the new Supabase database.

## Overview

The bot has been migrated from a local JSON file storage system to Supabase (PostgreSQL). This provides:

- ✅ Proper relational data structure
- ✅ Better data integrity with foreign keys
- ✅ Transactional support
- ✅ Scalability and concurrent access
- ✅ Backup and recovery features
- ✅ Query flexibility

## Before You Start

1. ✅ Complete the Supabase setup
2. ✅ Get your `SUPABASE_SERVICE_ROLE_KEY` (not the anon key!) from Supabase dashboard
3. ✅ Run the database migration (`migrations/001_initial_schema.sql`)
4. ✅ Backup your existing `keyValue.json` file (usually in `.data/keyValue.json`)

## Understanding the Data Structure Change

### Old Structure (keyValue.json)

```json
{
  "user:123456789:tos_agreed": true,
  "user:123456789:tos_version": "1.0.0-beta",
  "user:123456789:tos_agreed_at": "2024-01-01T00:00:00.000Z",
  "user:123456789:walletId": "w_123456789",
  "wallet:w_123456789:address": "FAKE000000000000000000000000000123456789"
}
```

### New Structure (Supabase)

**Users Table:**
```sql
telegram_id | tos_agreed | tos_version  | tos_agreed_at           | created_at | updated_at
123456789   | true       | 1.0.0-beta   | 2024-01-01T00:00:00Z   | ...        | ...
```

**Wallets Table:**
```sql
id          | user_telegram_id | address                              | created_at
w_123456789 | 123456789        | FAKE000000000000000000000000123456789 | ...
```

## Automatic Migration

**Good news!** The new code handles migration automatically:

1. When a user interacts with the bot, it checks if they exist in Supabase
2. If not, it creates their user record automatically
3. When they create/access a wallet, it's stored in the database

**You don't need to manually migrate data.** Users will be seamlessly migrated as they use the bot.

## Manual Migration (Optional)

If you want to migrate all existing users at once, you can use this Node.js script:

### Step 1: Create migration script

Create a file `scripts/migrate-data.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { userDb, walletDb } from '../src/infra/database';

async function migrateFromKeyValue() {
  const kvPath = process.env.KEYVALUE_PATH || path.join('.data', 'keyValue.json');
  
  if (!fs.existsSync(kvPath)) {
    console.log('No keyValue.json file found. Nothing to migrate.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(kvPath, 'utf8'));
  
  // Extract unique telegram IDs
  const telegramIds = new Set<string>();
  for (const key of Object.keys(data)) {
    const match = key.match(/^user:(\d+):/);
    if (match) telegramIds.add(match[1]);
  }

  console.log(`Found ${telegramIds.size} users to migrate`);

  for (const tgId of telegramIds) {
    try {
      // Migrate user ToS data
      const tosAgreed = data[`user:${tgId}:tos_agreed`] || false;
      const tosVersion = data[`user:${tgId}:tos_version`] || null;
      const tosAgreedAt = data[`user:${tgId}:tos_agreed_at`] || null;

      await userDb.upsertUser({
        telegram_id: tgId,
        tos_agreed: tosAgreed,
        tos_version: tosVersion,
        tos_agreed_at: tosAgreedAt,
      });

      // Migrate wallet data
      const walletId = data[`user:${tgId}:walletId`];
      if (walletId) {
        const address = data[`wallet:${walletId}:address`];
        if (address) {
          await walletDb.createWallet({
            id: walletId,
            user_telegram_id: tgId,
            address: address,
            private_key_encrypted: null,
          }).catch(err => {
            // Ignore duplicate key errors
            if (!err.message?.includes('duplicate')) throw err;
          });
        }
      }

      console.log(`✓ Migrated user ${tgId}`);
    } catch (err) {
      console.error(`✗ Failed to migrate user ${tgId}:`, err);
    }
  }

  console.log('Migration complete!');
}

migrateFromKeyValue().catch(console.error);
```

### Step 2: Run the migration

```bash
# Make sure your .env has SUPABASE_URL and SUPABASE_ANON_KEY set
npx tsx scripts/migrate-data.ts
```

### Step 3: Verify the migration

Check your Supabase dashboard to verify that users and wallets were migrated correctly.

### Step 4: Archive old data (Optional)

```bash
# Backup the old keyValue.json
mv .data/keyValue.json .data/keyValue.json.backup

# Or delete it if you're confident
rm .data/keyValue.json
```

## Rollback (If Needed)

If you need to rollback to the old system:

1. Checkout the previous git commit before the migration
2. Restore your `keyValue.json` from backup
3. Run `npm install && npm run build`

## Testing the Migration

After migration, test these flows:

1. ✅ New user flow: `/start` → `/agree` → `/start_wallet`
2. ✅ Existing user flow: `/start` (should show "Welcome back")
3. ✅ Wallet commands: `/deposit`, `/balance`
4. ✅ ToS re-acceptance when version updates

## Troubleshooting

### "Missing Supabase credentials" error
- Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.env`

### Users not migrating
- Check that the migration SQL ran successfully in Supabase
- Verify tables exist: `users` and `wallets`

### Wallet creation fails
- Check Supabase logs in the dashboard
- Verify foreign key constraints are set up correctly

## Need Help?

- Review [SETUP.md](./SETUP.md) for setup instructions
- Check [migrations/README.md](./migrations/README.md) for schema details
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines

