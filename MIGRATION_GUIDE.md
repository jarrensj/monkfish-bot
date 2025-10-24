# Migration Guide: keyValue.json → Supabase

The bot has moved from local JSON storage to **Supabase (PostgreSQL)**.

## Why this is better

* ✅ Relational structure (users ←→ wallets)
* ✅ Row Level Security (RLS) with explicit **service role** access
* ✅ Transactions, concurrency, backups
* ✅ Query flexibility

---

## Prereqs

* Supabase project ready
* Environment vars in the **bot** process:

  * `SUPABASE_URL`
  * `SUPABASE_SERVICE_ROLE_KEY` (⚠️ **service role**, not anon)
* Apply the SQL in your repo (users/wallets, RLS, policies).
  **No schema changes needed** beyond what’s already in that SQL.

---

## What changed

* The old file `keyValue.json` is no longer used or read at runtime.
* Data now lives in:

  * `users(telegram_id, tos_agreed, tos_version, tos_agreed_at, ...)`
  * `wallets(id, user_telegram_id, address, private_key_encrypted, ...)`
* The bot automatically **upserts a user row** on first interaction and gates actions behind ToS.

Status
- The legacy file store (.data/keyValue.json) has been removed.
- Supabase (PostgreSQL) is the single source of truth for users and wallets.
- New/existing users are handled automatically at runtime.

Old (example)

```json
{
  "user:123456789:tos_agreed": true,
  "user:123456789:tos_version": "1.0.0-beta",
  "user:123456789:tos_agreed_at": "2024-01-01T00:00:00.000Z",
  "user:123456789:walletId": "w_123456789",
  "wallet:w_123456789:address": "FAKE000000000000000000000000123456789"
}
```

New (tables)

**users**

```
telegram_id | tos_agreed | tos_version   | tos_agreed_at           | created_at | updated_at
123456789   | true       | 1.0.0-beta    | 2024-01-01T00:00:00Z    | ...        | ...
```

**wallets**

```
id          | user_telegram_id | address                               | created_at
w_123456789 | 123456789        | FAKE000000000000000000000000123456789 | ...
```

---

## Do I have to migrate old data?

**No.** The bot performs **on-demand migration**:

- No. The bot auto-creates/updates user records on first interaction (/start, /tos-accept, etc.).
- Wallet rows are created via the backend when needed.

This makes manual migration optional.

---

## Optional: manual bulk migration from a saved file

Cleanup
- Remove any `.data/` artifacts and KEYVALUE_* env vars if present.


**1) Create `scripts/migrate-data.ts`**

```ts
// scripts/migrate-data.ts
// Verification script (no migration). Confirms Supabase connectivity and prints basic stats.

import "dotenv/config";
import { getSupabaseClient } from "../src/infra/db/supabase"; // adjust path if different

async function main() {
  try {
    const supabase = getSupabaseClient();

    const { count: userCount, error: usersErr } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (usersErr) {
      console.error("[verify] users count error:", usersErr);
      process.exit(1);
    }

    const { count: walletCount, error: walletsErr } = await supabase
      .from("wallets")
      .select("*", { count: "exact", head: true });

    if (walletsErr) {
      console.error("[verify] wallets count error:", walletsErr);
      process.exit(1);
    }

    console.log("Supabase verification OK:");
    console.log(` - users count  : ${userCount ?? 0}`);
    console.log(` - wallets count: ${walletCount ?? 0}`);
    console.log("\nNothing to migrate. The legacy keyValue store has been removed.");
    process.exit(0);
  } catch (e: any) {
    console.error("Verification failed:", e?.message || e);
    process.exit(1);
  }
}

main();

```

**2) Run it**

```bash
# .env must have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npx tsx scripts/migrate-data.ts
```

**3) Verify**

* Check Supabase tables `users` and `wallets`.

---

## Rollback (if you must)

* Checkout a commit before this migration.
* Restore your `.data/keyValue.json` backup.
* Reinstall & run the old bot. (Not recommended long-term.)

---

## Test checklist

* ✅ New user: `/start` → `/tos-accept` (or `/agree`) → `/start_wallet`
* ✅ Existing user: `/start` shows “Welcome back”
* ✅ `/deposit`, `/balance` work
* ✅ ToS re-prompt when `TOS_VERSION` changes

---

## Troubleshooting

**“Missing Supabase credentials”**
Set `SUPABASE_URL` and **`SUPABASE_SERVICE_ROLE_KEY`** in the bot’s environment.

If you don’t want the verification script, you can delete scripts/migrate-data.ts entirely and remove its mention from docs.

### Optional: keep a CSV import path (only if you ever need it later)

If you ever receive a legacy CSV dump, you could extend the script to read scripts/users.csv / scripts/wallets.csv and upsert into Supabase. Not necessary now.


## Need Help?

- Review [SETUP.md](./SETUP.md) for setup instructions
- Check [migrations/README.md](./migrations/README.md) for schema details
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
