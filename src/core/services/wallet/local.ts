// Local development wallet service - generates and persists ed25519 keypairs per user

import { keyValue } from "../../../infra/keyValue";
import { getSolBalance } from "../../../infra/solana";
import type { IWalletService, WalletRef, Balances } from "./types";

// Telegram user IDs are numeric. Allow 5–20 digits to be safe across environments
const TELEGRAM_ID_REGEX = /^\d{5,20}$/;

// Returns true if `id` is a digits-only string of reasonable length
function validateTelegramId(id: unknown): id is string {
  return typeof id === "string" && TELEGRAM_ID_REGEX.test(id);
}

// Throws if the id is invalid; narrows the type for TS
function assertTelegramId(id: unknown): asserts id is string {
  if (!validateTelegramId(id)) {
    throw new Error("Invalid telegramId: expected a digits-only string (5–20 chars).");
  }
}

// TODO: Migrate to DB with proper wallet storage
// Wallets table: { id, user_id (FK to Users), address, private_key_encrypted, created_at }
// This allows proper relational queries, transactions, and secure key storage
export class LocalDevWalletService implements IWalletService {
  // Generate a fake but deterministic Solana-like address for the user
  async getOrCreateUserWallet(telegramId: string): Promise<WalletRef> {
    assertTelegramId(telegramId);

    let walletId = keyValue.get<string>(`user:${telegramId}:walletId`);
    
    if (!walletId) {
      walletId = `w_${telegramId}`;
      // Generate a fake base58-looking address (real Solana addresses are 32-44 chars)
      const fakeAddress = `FAKE${telegramId.padStart(39, '0').slice(0, 39)}`;
      keyValue.set(`wallet:${walletId}:address`, fakeAddress);
      keyValue.set(`user:${telegramId}:walletId`, walletId);
    }
    
    const address = keyValue.get<string>(`wallet:${walletId}:address`, "");
    return { walletId, address };
  }

  // Fetch balance (will return 0 for fake addresses)
  async getBalances(walletId: string): Promise<Balances> {
    const address = await this.getAddress(walletId);
    const SOL = await getSolBalance(address);
    return { SOL };
  }

  // Retrieve wallet's fake address from keyValue
  async getAddress(walletId: string): Promise<string> {
    return keyValue.get<string>(`wallet:${walletId}:address`, "");
  }
}