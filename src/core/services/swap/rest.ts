// src/core/services/swap/rest.ts
import type { ISwapService, QuoteInput, QuoteResult } from "./types";
import { apiRequest } from "../../../infra/api";

export class RestSwapService implements ISwapService {
  constructor(private baseUrl: string) {
    if (!/^https:\/\//i.test(baseUrl)) throw new Error("KOI_API_URL must be HTTPS");
  }

  async resolveToken(input: string) {
    return apiRequest<{ mint: string; symbol: string }>(this.baseUrl, "/tokens/resolve", {
      method: "GET",
      query: { input },
    });
  }

  async quote(input: QuoteInput): Promise<QuoteResult> {
    return apiRequest<QuoteResult>(this.baseUrl, "/quote", {
      method: "GET",
      query: { outToken: input.outToken, amountSOL: input.amountSOL },
    });
  }

  async swap(input: QuoteInput & { walletId: string }): Promise<{ txId: string; note?: string }> {
    const idempotencyKey = `tg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return apiRequest<{ txId: string; note?: string }>(this.baseUrl, "/swap", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: {
        walletId: input.walletId,
        outToken: input.outToken,
        amountSOL: input.amountSOL,
      },
    });
  }
}
