// Type definitions for wallet service - handles user wallets and balances
// Reference to a user's wallet with ID and Solana address
export type WalletRef = { walletId: string; address: string };

// Balance information for supported currencies
export type Balances = {
  SOL: number;
  // tokens coming later
};

// Core wallet operations interface
export interface IWalletService {
  // Create (or return existing) wallet for this Telegram user
  getOrCreateUserWallet(telegramId: string): Promise<WalletRef>;
  
  // Get balances for an existing wallet
  getBalances(walletId: string): Promise<Balances>;
  
  // Convenience: return the base58 address for a walletId
  getAddress(walletId: string): Promise<string>;
}