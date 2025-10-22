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

// Minimal shape we use from Dexscreener; extend if needed
export type DexPair = {
  chainId: string;
  priceUsd?: string | number;
  priceNative?: string | number; // SOL per token
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  baseToken?: { symbol?: string; address?: string };
};

export type DexTokenQuote = {
  symbol: string;
  priceUsd: number;
  priceNative: number; // SOL per token
  liquidityUsd: number;
  volume24hUsd: number;
};

/** Abortable fetch with timeout */
async function fetchWithTimeout(url: string, ms = 5000, init?: RequestInit) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

/** Get the best Solana pair for a mint, preferring highest USD liquidity */
export async function getSolanaTokenPair(mint: string, msTimeout = 5000): Promise<DexPair | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      msTimeout
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pairs: DexPair[] = Array.isArray(data?.pairs) ? data.pairs : [];
    const solPairs = pairs.filter((p) => p?.chainId === "solana");
    if (!solPairs.length) return null;
    solPairs.sort(
      (a, b) => (b?.liquidity?.usd ?? 0) - (a?.liquidity?.usd ?? 0)
    );
    return solPairs[0] ?? null;
  } catch {
    return null;
  }
}

/** Convert a Dexscreener pair into our normalized quote */
export function toDexTokenQuote(pair: DexPair): DexTokenQuote | null {
  const priceUsd = Number(pair?.priceUsd ?? 0);
  const priceNative = Number(pair?.priceNative ?? 0);
  if (!(priceUsd > 0 && priceNative > 0)) return null;

  return {
    symbol: pair?.baseToken?.symbol ?? "TOKEN",
    priceUsd,
    priceNative,
    liquidityUsd: Number(pair?.liquidity?.usd ?? 0),
    volume24hUsd: Number(pair?.volume?.h24 ?? 0),
  };
}

/** Very loose Solana mint check (base58, 32–44 chars) */
export function looksLikeMint(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

/** Simple symbol->mint lookup (replace with Jupiter token list later) */
export function resolveTokenMint(input: string): string {
  // Common Solana mints (extend as needed)
  const REG: Record<string, string> = {
    // Native SOL / Wrapped SOL (DexScreener uses this)
    SOL:  "So11111111111111111111111111111111111111112",
    WSOL: "So11111111111111111111111111111111111111112",

    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    JUP:  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    RAY:  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",

    // add more symbols you expect (e.g., WIF, JTO, PYTH, JTO, etc.)
    // WIF:  "<WIF_MINT>",
  };

  const up = input.trim().toUpperCase();
  if (REG[up]) return REG[up];

  // If they passed a mint already, accept it
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input)) return input;

  // Fallback: unknown (caller will handle as error)
  return input;
}

/** Escape HTML for safe Telegram HTML parse_mode */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]!));
}

/** Optional: micro per-user cooldown (simple in-memory) */
const lastCall = new Map<string, number>();
export function underCooldown(key: string, ms = 1500): boolean {
  const now = Date.now();
  const last = lastCall.get(key) ?? 0;
  if (now - last < ms) return true;
  lastCall.set(key, now);
  return false;
}
