import type { IWalletService, WalletRef, Balances } from "./types";
import { walletDb, userDb } from "../../../infra/database";

// Simple, deterministic "fake" Solana-looking address for dev
function makeFakeAddressFromTg(tg: string): string {
  // Real Solana addresses are base58 (32–44). This is clearly fake but stable.
  return `FAKE${tg.padStart(39, "0").slice(0, 39)}`;
}

/**
 * LocalDevWalletService
 * - Persists 1 fake address per Telegram user in Supabase
 * - getBalances returns 0 (no RPC call)
 * - This is just to keep /start_wallet and /deposit flows alive until Privy
 */
export class LocalDevWalletService implements IWalletService {
  async getOrCreateUserWallet(telegramId: string): Promise<WalletRef> {
    try {
      // Ensure user exists in database (with default ToS values)
      const user = await userDb.getUser(telegramId);
      if (!user) {
        await userDb.upsertUser({
          telegram_id: telegramId,
          tos_agreed: false,
          tos_version: null,
          tos_agreed_at: null,
        });
      }

      // Check if wallet exists
      let wallet = await walletDb.getWalletByUserId(telegramId);
      
      if (!wallet) {
        // Create new wallet
        const walletId = `w_${telegramId}`;
        const address = makeFakeAddressFromTg(telegramId);
        
        wallet = await walletDb.createWallet({
          id: walletId,
          user_telegram_id: telegramId,
          address,
          private_key_encrypted: null,
        });
      }

      return { walletId: wallet.id, address: wallet.address };
    } catch (err) {
      console.error('[LocalDevWalletService] getOrCreateUserWallet error:', err);
      throw new Error('Failed to get or create user wallet');
    }
  }

  async getBalances(_walletId: string): Promise<Balances> {
    // No on-chain call in dev
    return { SOL: 0 };
  }

  async getAddress(walletId: string): Promise<string> {
    try {
      const wallet = await walletDb.getWallet(walletId);
      return wallet?.address || "";
    } catch (err) {
      console.error('[LocalDevWalletService] getAddress error:', err);
      return "";
    }
  }
}

