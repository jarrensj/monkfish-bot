// Single auth mode: per-Telegram-user JWT issued by backend
export type AuthMode = "jwt_user"; // kept for clarity, but we only implement jwt_user

// Common error
export class KoiApiError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, opts: { status?: number; code?: string } = {}) {
    super(message);
    this.name = "KoiApiError";
    this.status = opts.status;
    this.code = opts.code;
  }
}

// Quote / Swap
export type QuoteRisk = { honeypot?: boolean; notes?: string };
export type QuoteResponse = {
  ok: true;
  estOut: number;
  impactPct?: number;
  hops?: number;
  risk?: QuoteRisk;
  source?: string;
};
export type QuoteError = { ok: false; error: string; code?: string };

export type SwapResponse = { ok: true; txId?: string; estimatedOut?: number };
export type SwapError = { ok: false; error: string; code?: string };

// Cadence trader (compat with your existing route)
export type CadenceSwapResponse =
  | { ok: true; transactionSignature?: string; tx?: string; estOut?: number; quote?: any }
  | { ok: false; error: string; code?: string };

// Wallets
export type WalletCreateResponse = { ok: true; walletId: string; address?: string; chain?: string };
export type WalletAddressResponse = { ok: true; address: string; chain: string; walletId?: string };
export type WalletBalanceResponse = {
  ok: true;
  balances: Array<{ symbol: string; chain: string; amount: string; address?: string }>;
};

// Algos / Allocations (example shapes—match backend)
export type Algo = { id: string; name: string; status: "active" | "inactive" };
export type Allocation = { algoId: string; percent: number };
export type AlgosListResponse = { ok: true; algos: Algo[] };
export type AllocationsGetResponse = { ok: true; allocations: Allocation[] };
export type AllocationsSetBody = { allocations: Allocation[] };
export type AllocationsSetResponse = { ok: true; allocations: Allocation[] };