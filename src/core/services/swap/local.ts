//**
// Temporary implementation that:

// resolves token by symbol or mint (USDC/USDT/BONK + mints),

// returns a mock quote (e.g., assume 1 SOL ≈ 100 USDC),

// returns a mock tx id for /swap
// */


import type { ISwapService, QuoteInput, QuoteResult } from "./types";

/**
 * Minimal registry to make swaps/quotes work without backend.
 * Extend this later or replace with a real provider.
 */
const TOKENS: Array<{ symbol: string; mint: string; decimals: number }> = [
  { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
  { symbol: "USDT", mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
  { symbol: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", decimals: 5 },
];

const isMint = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
const sanitize = (s: string) => s.trim().replace(/\s+/g, "");
const toSym = (s: string) => sanitize(s).toUpperCase();

export class MockSwapService implements ISwapService {
  async resolveToken(input: string) {
    const raw = sanitize(input);
    if (!raw) throw new Error("Missing token. Try a symbol like USDC or a full mint address.");
    if (isMint(raw)) {
      const hit = TOKENS.find(t => t.mint === raw);
      return { mint: raw, symbol: hit?.symbol ?? "UNKNOWN" };
    }
    const sym = toSym(raw);
    const hit = TOKENS.find(t => t.symbol === sym);
    if (!hit) throw new Error(`Unknown token '${input}'. Try USDC, USDT, BONK or paste a mint address.`);
    return { mint: hit.mint, symbol: hit.symbol };
  }

  async quote({ outToken, amountSOL }: QuoteInput): Promise<QuoteResult> {
    if (!(amountSOL > 0)) throw new Error("Amount must be > 0.");
    const { mint, symbol } = await this.resolveToken(outToken);

    // MOCK: 1 SOL ≈ 100 units of outToken for demo; 0.10% impact.
    const estimatedOut = amountSOL * 100;
    return {
      inToken: "SOL",
      outToken: mint,
      outSymbol: symbol,
      amountSOL,
      estimatedOut,
      priceImpactPct: 0.1,
      routeNote: "Mock route (backend not connected)",
    };
  }

  async swap({ outToken, amountSOL, walletId }: QuoteInput & { walletId: string }) {
    if (!walletId) throw new Error("Wallet not found.");
    if (!(amountSOL > 0)) throw new Error("Amount must be > 0.");
    // Resolve to validate token input, even though this is a mock:
    await this.resolveToken(outToken);

    // MOCK success:
    const txId = `SIM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return { txId, note: "Swap executed (mock). Replace with real provider later." };
  }
}
