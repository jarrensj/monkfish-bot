import type { IWalletService, WalletRef, Balances } from "./types";
import { apiRequest } from "../../../infra/api";


//  adapter Swap HTTP adapter implementing your existing ISwapService
export class RestWalletService implements IWalletService {
  constructor(private baseUrl: string) {
    if (!/^https:\/\//i.test(baseUrl)) throw new Error("KOI_API_URL must be HTTPS");
  }

  async getOrCreateUserWallet(telegramId: string): Promise<WalletRef> {
    return apiRequest<WalletRef>(this.baseUrl, "/wallets/getOrCreate", {
      method: "POST",
      body: { telegramId },
    });
  }

  async getBalances(walletId: string): Promise<Balances> {
    return apiRequest<Balances>(this.baseUrl, `/wallets/${encodeURIComponent(walletId)}/balances`, { method: "GET" });
  }

  async getAddress(walletId: string): Promise<string> {
    const r = await apiRequest<{ address: string }>(this.baseUrl, `/wallets/${encodeURIComponent(walletId)}`, { method: "GET" });
    return r.address;
  }
}
