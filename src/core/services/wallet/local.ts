import type { IWalletService, WalletRef, Balances } from "./types";
import { keyValue } from "../../../infra/keyValue";

// Simple, deterministic “fake” Solana-looking address for dev
function makeFakeAddressFromTg(tg: string): string {
  // Real Solana addresses are base58 (32–44). This is clearly fake but stable.
  return `FAKE${tg.padStart(39, "0").slice(0, 39)}`;
}

/**
 * LocalDevWalletService
 * - Persists 1 fake address per Telegram user in keyValue
 * - getBalances returns 0 (no RPC call)
 * - This is just to keep /start_wallet and /deposit flows alive until Privy
 */
export class LocalDevWalletService implements IWalletService {
  async getOrCreateUserWallet(telegramId: string): Promise<WalletRef> {
    const key = `user:${telegramId}:walletId`;
    let walletId = keyValue.get<string>(key);
    if (!walletId) {
      walletId = `w_${telegramId}`;
      keyValue.set(key, walletId);
      keyValue.set(`wallet:${walletId}:address`, makeFakeAddressFromTg(telegramId));
    }
    const address = keyValue.get<string>(`wallet:${walletId}:address`, makeFakeAddressFromTg(telegramId));
    return { walletId, address };
  }

  async getBalances(_walletId: string): Promise<Balances> {
    // No on-chain call in dev
    return { SOL: 0 };
  }

  async getAddress(walletId: string): Promise<string> {
    return keyValue.get<string>(`wallet:${walletId}:address`, "");
  }
}
