import {
  KoiApiError,
  QuoteResponse, QuoteError,
  SwapResponse, SwapError,
  CadenceSwapResponse,
  WalletCreateResponse, WalletAddressResponse, WalletBalanceResponse,
  AlgosListResponse, AllocationsGetResponse, AllocationsSetBody, AllocationsSetResponse,
} from "./types";

/**
 * Env config (jwt_user ONLY):
 *  - KOI_API_URL=https://your-koi
 *  - KOI_AUTH_TOKEN_PATH=/api/auth/token    # POST { telegramId }, returns { token }   (default)
 *  - KOI_USER_TOKEN_TTL_SEC=900             # cache user tokens for 15 min (default)
 *  - BOT_ID=monkfish-prod                   # optional tracing
 */

const BASE = (process.env.KOI_API_URL || "").replace(/\/+$/, "");
const AUTH_TOKEN_PATH = process.env.KOI_AUTH_TOKEN_PATH || "/api/auth/token";
const USER_TOKEN_TTL_SEC = Number(process.env.KOI_USER_TOKEN_TTL_SEC ?? 900);

if (!BASE) {
  throw new Error("KOI_API_URL not set");
}

export type CallerMeta = { userId: string | number; command?: string; traceId?: string };

// --------- per-user token cache ---------
class UserTokenStore {
  private map = new Map<string, { token: string; expAt: number }>();
  private ttlMs: number;
  constructor(ttlSec: number) { this.ttlMs = Math.max(60, ttlSec) * 1000; }
  get(userId: string | number): string | null {
    const k = String(userId);
    const rec = this.map.get(k);
    if (!rec) return null;
    if (Date.now() >= rec.expAt) { this.map.delete(k); return null; }
    return rec.token;
  }
  set(userId: string | number, token: string) {
    this.map.set(String(userId), { token, expAt: Date.now() + this.ttlMs });
  }
  clear(userId?: string | number) {
    if (userId == null) this.map.clear();
    else this.map.delete(String(userId));
  }
}
const userTokens = new UserTokenStore(USER_TOKEN_TTL_SEC);

// --------- low-level fetch ---------
async function doFetch(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* keep text for error */ }
  return { res, data, text };
}

// --------- token fetch (per user) ---------
async function getUserToken(userId: string | number): Promise<string> {
  const cached = userTokens.get(userId);
  if (cached) return cached;

  const url = `${BASE}${AUTH_TOKEN_PATH}`;
  const { res, data, text } = await doFetch(url, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ telegramId: String(userId) }),
  });

  if (!res.ok) throw new KoiApiError((data?.error || text || `HTTP ${res.status}`), { status: res.status });
  const token = data?.token || data?.accessToken;
  if (!token) throw new KoiApiError("Token endpoint did not return a token");
  userTokens.set(userId, token);
  return token;
}

// --------- core request helper (always jwt_user) ---------
async function requestJSON<TOk>(
  path: string,
  init: RequestInit & { koiMeta: CallerMeta }   // userId required
): Promise<TOk> {
  const url = `${BASE}${path}`;
  const method = (init.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    accept: "application/json",
    ...(init.body ? { "content-type": "application/json" } : { "content-type": "application/json" }),
  };

  // Required: user-scoped JWT
  const tok = await getUserToken(init.koiMeta.userId);
  headers.authorization = `Bearer ${tok}`;

  // Attribution (helps backend auditing even with user JWT)
  headers["x-user-id"] = String(init.koiMeta.userId);
  if (init.koiMeta.command) headers["x-command"] = init.koiMeta.command;
  if (init.koiMeta.traceId) headers["x-trace-id"] = init.koiMeta.traceId;
  if (process.env.BOT_ID) headers["x-bot-id"] = process.env.BOT_ID;

  // small retry on transient errors
  const attempt = async (): Promise<TOk> => {
    const { res, data, text } = await doFetch(url, { ...init, method, headers });
    if (!res.ok) {
      // If token expired/invalid, clear cache once and re-try
      if (res.status === 401) {
        userTokens.clear(init.koiMeta.userId);
      }
      throw new KoiApiError((data?.error || data?.message || text || `HTTP ${res.status}`), { status: res.status, code: data?.code });
    }
    return data as TOk;
  };

  try {
    return await attempt();
  } catch (e: any) {
    if ([0, 401, 429, 500, 502, 503, 504].includes(e?.status)) {
      const backoff = 250 + Math.floor(Math.random() * 250);
      await new Promise(r => setTimeout(r, backoff));
      // retry once (401 path will refetch token via requestJSON entry)
      const tok2 = await getUserToken(init.koiMeta.userId);
      headers.authorization = `Bearer ${tok2}`;
      return await attempt();
    }
    throw e;
  }
}

// --------- Public API (all endpoints) ---------
export class KoiApi {
  // Quotes & Swaps
  quote(mintOrAddress: string, amountNative: number, meta: CallerMeta) {
    const q = new URLSearchParams({ mint: mintOrAddress, amountSOL: String(amountNative) }).toString();
    return requestJSON<QuoteResponse | QuoteError>(`/api/quote?${q}`, { method: "GET", koiMeta: { ...meta, command: "quote" }})
      .then(d => {
        if (!("ok" in d) || !d.ok) throw new KoiApiError((d as QuoteError).error || "Quote failed");
        return d;
      });
  }

  swap(mintOrAddress: string, amountNative: number, meta: CallerMeta) {
    const body = JSON.stringify({ mint: mintOrAddress, amountSOL: amountNative });
    return requestJSON<SwapResponse | SwapError>(`/api/swap`, { method: "POST", body, koiMeta: { ...meta, command: "swap" }})
      .then(d => {
        if (!("ok" in d) || !d.ok) throw new KoiApiError((d as SwapError).error || "Swap failed");
        return d;
      });
  }

  /** Compatibility route for cadence trader, if you still use it */
  cadenceSwap(
    payload: {
      public_wallet?: string;
      sellToken: string;
      buyToken: string;
      blockchain: string;
      amount: number;
      dryRun?: boolean;
      slippageBps?: number;
      priorityFee?: number;
    },
    meta: CallerMeta
  ) {
    return requestJSON<CadenceSwapResponse>(`/api/algo/cadence-trader`, {
      method: "POST",
      body: JSON.stringify(payload),
      koiMeta: { ...meta, command: "swap" }
    }).then(d => {
      if (!("ok" in d) || !d.ok) throw new KoiApiError((d as any).error || "Cadence swap failed");
      return d;
    });
  }

  // Wallets
  walletCreate(meta: CallerMeta) {
    return requestJSON<WalletCreateResponse>(`/api/wallet/create`, { method: "POST", koiMeta: { ...meta, command: "wallet" }});
  }
  walletDepositAddress(chain: string, meta: CallerMeta) {
    const q = new URLSearchParams({ chain }).toString();
    return requestJSON<WalletAddressResponse>(`/api/wallet/deposit?${q}`, { method: "GET", koiMeta: { ...meta, command: "wallet" }});
  }
  walletBalance(meta: CallerMeta) {
    return requestJSON<WalletBalanceResponse>(`/api/wallet/balance`, { method: "GET", koiMeta: { ...meta, command: "wallet" }});
  }

  // Algos & Allocations (match your teammate’s tests)
  algosList(meta: CallerMeta) {
    return requestJSON<AlgosListResponse>(`/api/algos`, { method: "GET", koiMeta: { ...meta, command: "algos" }});
  }
  allocationsGet(meta: CallerMeta) {
    const search = new URLSearchParams({ telegramId: String(meta.userId) }).toString();
    return requestJSON<AllocationsGetResponse>(`/api/allocations?${search}`, { method: "GET", koiMeta: { ...meta, command: "allocations" }});
  }
  allocationsEnable(body: { algoId: string; amountSol: number }, meta: CallerMeta) {
    return requestJSON<{ allocationId?: string; algoCode?: string; status?: string; ok?: true } | { ok: false; error: string }>(
      `/api/allocations/enable`,
      { method: "POST", body: JSON.stringify(body), koiMeta: { ...meta, command: "allocations" } }
    );
  }
  allocationsDisable(body: { algoId: string; amountSol: number }, meta: CallerMeta) {
    return requestJSON<{ algoCode?: string; status?: string; ok?: true } | { ok: false; error: string }>(
      `/api/allocations/disable`,
      { method: "POST", body: JSON.stringify(body), koiMeta: { ...meta, command: "allocations" } }
    );
  }

}

export const koiApi = new KoiApi();