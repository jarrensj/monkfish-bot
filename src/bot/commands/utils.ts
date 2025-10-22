// src/bot/utils.ts
import type { Telegraf, Context } from "telegraf";
import type { Message } from "telegraf/types";

type Bot = Telegraf<Context>;

/* ========= Basic util commands (unchanged) ========= */

export function registerUtilCommands(bot: Bot) {
  bot.command("ping", (ctx) => ctx.reply("pong"));

  bot.command("echo", (ctx) => {
    if (!isTextMessage(ctx)) return;
    const [, ...rest] = ctx.message.text.trim().split(/\s+/);
    return ctx.reply(rest.join(" ") || "…");
  });
}

export function isTextMessage(ctx: Context): ctx is Context & { message: Message.TextMessage } {
  return ctx.updateType === "message" && !!ctx.message && "text" in ctx.message;
}

export type LogMeta = Record<string, unknown>;

export function logErr(label: string, err: unknown, meta: LogMeta = {}): void {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(
    JSON.stringify({
      level: "error",
      label,
      name: e.name,
      message: e.message,
      stack: e.stack,
      meta,
      ts: new Date().toISOString(),
      env: process.env.NODE_ENV ?? "development",
    })
  );
}

/* ========= Dexscreener + quote helpers ========= */

// ---- Mint/symbol validators ----
export const looksLikeMint = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
export const looksLikeSymbol = (s: string) => /^[A-Za-z]{2,10}$/.test(s);

// ---- Minimal HTML escape for Telegram HTML parse_mode ----
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]!));
}

// ---- Dexscreener helpers you already had (keep) ----
export type DexPair = {
  chainId: string;
  priceUsd?: string | number;
  priceNative?: string | number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  baseToken?: { symbol?: string; address?: string };
};
export type DexTokenQuote = {
  symbol: string; priceUsd: number; priceNative: number; liquidityUsd: number; volume24hUsd: number;
};

async function fetchWithTimeout(url: string, ms = 5000, init?: RequestInit) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

export async function getSolanaTokenPair(mint: string, msTimeout = 5000): Promise<DexPair | null> {
  try {
    const res = await fetchWithTimeout(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, msTimeout);
    if (!res.ok) return null;
    const data = await res.json();
    const pairs: DexPair[] = Array.isArray(data?.pairs) ? data.pairs : [];
    const solPairs = pairs.filter((p) => p?.chainId === "solana");
    if (!solPairs.length) return null;
    solPairs.sort((a, b) => (b?.liquidity?.usd ?? 0) - (a?.liquidity?.usd ?? 0));
    return solPairs[0] ?? null;
  } catch { return null; }
}

export function toDexTokenQuote(pair: DexPair): DexTokenQuote | null {
  const priceUsd = Number(pair?.priceUsd ?? 0);
  const priceNative = Number(pair?.priceNative ?? 0);
  if (!(priceUsd > 0 && priceNative > 0)) return null;
  return {
    symbol: pair?.baseToken?.symbol ?? "TOKEN",
    priceUsd, priceNative,
    liquidityUsd: Number(pair?.liquidity?.usd ?? 0),
    volume24hUsd: Number(pair?.volume?.h24 ?? 0),
  };
}

// ---- Dynamic SYMBOL -> MINT resolution ----

// 1) Small hardcoded safety net (incl. SOL/WSOL)
const STATIC_REG: Record<string, string> = {
  SOL:  "So11111111111111111111111111111111111111112",
  WSOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP:  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  RAY:  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
};

// 2) In-memory token map from Jupiter
let tokenMap = new Map<string, string>(); // SYMBOL -> MINT
let tokenMapLoadedAt = 0;

// Load or refresh Jupiter list (TTL default 6h)
async function ensureTokenMap(ttlMs = 6 * 60 * 60 * 1000) {
  const now = Date.now();
  if (now - tokenMapLoadedAt < ttlMs && tokenMap.size) return;

  try {
    const res = await fetchWithTimeout("https://token.jup.ag/all", 7000);
    if (!res.ok) throw new Error(`Jupiter list ${res.status}`);
    const list = await res.json();
    const next = new Map<string, string>();

    // Jupiter list is Solana; map first-seen symbol -> mint
    for (const t of list as Array<{ address: string; symbol: string }>) {
      const sym = (t.symbol || "").trim().toUpperCase();
      const addr = (t.address || "").trim();
      if (looksLikeMint(addr) && looksLikeSymbol(sym) && !next.has(sym)) {
        next.set(sym, addr);
      }
    }

    // Always include our static fallbacks
    for (const [k, v] of Object.entries(STATIC_REG)) next.set(k, v);

    tokenMap = next;
    tokenMapLoadedAt = now;
  } catch {
    // If Jupiter fails, at least ensure statics exist
    if (!tokenMap.size) {
      tokenMap = new Map(Object.entries(STATIC_REG));
      tokenMapLoadedAt = now;
    }
  }
}

// 3) Dexscreener search fallback by symbol (filter Solana, pick highest-liquidity base)
async function findMintViaDexSearch(symbol: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(symbol);
    const res = await fetchWithTimeout(`https://api.dexscreener.com/latest/dex/search?q=${q}`, 7000);
    if (!res.ok) return null;
    const data = await res.json();
    const pairs: DexPair[] = Array.isArray(data?.pairs) ? data.pairs : [];
    const symUp = symbol.toUpperCase();

    const solMatches = pairs.filter(
      (p) => p?.chainId === "solana" && (p?.baseToken?.symbol || "").toUpperCase() === symUp
    );
    if (!solMatches.length) return null;

    solMatches.sort((a, b) => (b?.liquidity?.usd ?? 0) - (a?.liquidity?.usd ?? 0));
    const best = solMatches[0];
    const addr = best?.baseToken?.address ?? null;
    return looksLikeMint(addr ?? "") ? addr! : null;
  } catch {
    return null;
  }
}

// Public: resolve any input to a mint (mint → mint; symbol → mint)
export async function resolveMintSmart(input: string): Promise<string | null> {
  const raw = input.trim();
  if (looksLikeMint(raw)) return raw;

  const sym = raw.toUpperCase();
  await ensureTokenMap();

  if (tokenMap.has(sym)) return tokenMap.get(sym)!;

  // Fallback: Dexscreener search
  const addr = await findMintViaDexSearch(sym);
  if (addr) {
    tokenMap.set(sym, addr); // simple cache
    return addr;
  }
  return null;
}

// Optional: tiny user cooldown to avoid hammering
const lastCall = new Map<string, number>();
export function underCooldown(key: string, ms = 1500): boolean {
  const now = Date.now();
  const last = lastCall.get(key) ?? 0;
  if (now - last < ms) return true;
  lastCall.set(key, now);
  return false;
}