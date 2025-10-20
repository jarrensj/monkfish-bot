// Local development wallet service - generates and persists ed25519 keypairs per user

import { keyValue } from "../../../infra/keyValue.ts";
import { getSolBalance } from "../../../infra/solana.ts";
import type { IWalletService, WalletRef, Balances } from "./types";


export class LocalDevWalletService implements IWalletService {
  // Generate a fake but deterministic Solana-like address for the user
  async getOrCreateUserWallet(telegramId: string): Promise<WalletRef> {
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