// Factory for wallet service - switches between implementations based on config
import type { IWalletService } from "./types";
import { LocalDevWalletService } from "./local";


// Return appropriate wallet service implementation
export function makeWalletService(): IWalletService {
  // Later: if (process.env.WALLET_MODE === 'privy') return new PrivyWalletService();
  return new LocalDevWalletService();
}