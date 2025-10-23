import type { IWalletService } from "./types";
import { LocalDevWalletService } from "./local";
import { RestWalletService } from "./rest";

/**
 * Wallet service factory
 * - Default: LocalDevWalletService (keeps /start_wallet and /deposit working now)
 * - WALLET_MODE=http: return REST stub (throws until backend provides /wallets/*)
 */
export function makeWalletService(): IWalletService {
  const mode = (process.env.WALLET_MODE || "development").toLowerCase();

  if (mode === "http") {
    const url = process.env.KOI_API_URL;
    if (!url) throw new Error("WALLET_MODE=http but KOI_API_URL is not set");
    // NOTE: This will throw at runtime because backend routes aren't implemented yet
    return new RestWalletService(url);
  }

  // development / default: local fake wallet
  return new LocalDevWalletService();
}
