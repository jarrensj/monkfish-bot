import type { IWalletService, WalletRef, Balances } from "./types";

/**
 * RestWalletService (stub for future Privy-backed backend)
 * TODO(SECURITY): Implement real endpoints when koi backend exposes /wallets/* (Privy).
 * For now, this throws because your backend doesn't provide these routes yet.
 */
export class RestWalletService implements IWalletService {
  constructor(private baseUrl: string) {
    // Allow http://localhost for dev; enforce HTTPS in prod when you wire this up.
  }

  async getOrCreateUserWallet(_telegramId: string): Promise<WalletRef> {
    throw new Error("RestWalletService not wired: backend /wallets/getOrCreate not implemented.");
  }

  async getBalances(_walletId: string): Promise<Balances> {
    throw new Error("RestWalletService not wired: backend /wallets/:id/balances not implemented.");
  }

  async getAddress(_walletId: string): Promise<string> {
    throw new Error("RestWalletService not wired: backend /wallets/:id not implemented.");
  }
}
