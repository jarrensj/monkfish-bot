// Type definitions for wallet service - handles user wallets and balances

export type WalletRef = { walletId: string; address: string };

export type Balances = {
  SOL: number;
  // tokens coming later
};

export interface IWalletService {
  getOrCreateUserWallet(telegramId: string): Promise<WalletRef>;
  getBalances(walletId: string): Promise<Balances>;
  getAddress(walletId: string): Promise<string>;
}
