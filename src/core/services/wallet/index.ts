// Factory for wallet service - switches between implementations based on config
import type { IWalletService } from "./types";
import { LocalDevWalletService } from "./local";
import { RestWalletService } from "./rest";

// Return appropriate wallet service implementation
export function makeWalletService(): IWalletService {
  const mode = (process.env.WALLET_MODE || "local").toLowerCase();
  if ( mode === "http") {
    const url = process.env.KOI_API_URL;
    if (!url) {
      throw new Error("WALLET_MODE=http but KOI_API_URL is not set");
    }
    return new RestWalletService(url);
  }
  // Later: if (process.env.WALLET_MODE === 'privy') return new PrivyWalletService();
  return new LocalDevWalletService();
}