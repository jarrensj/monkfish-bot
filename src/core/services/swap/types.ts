export type QuoteInput = {
  /** Target token to BUY using SOL (symbol or mint) */
  outToken: string;
  /** Amount of SOL to spend */
  amountSOL: number;
};

export type QuoteResult = {
  inToken: "SOL";
  outToken: string;     // resolved mint address
  outSymbol: string;    // resolved ticker/symbol
  amountSOL: number;
  estimatedOut: number; // mock estimate for now
  priceImpactPct: number; // mock placeholder
  routeNote?: string;
};

export interface ISwapService {
  /** Resolve a symbol or a mint to a canonical mint + symbol */
  resolveToken(input: string): Promise<{ mint: string; symbol: string }>;
  /** Return an estimated OUT amount for a SOL spend (mock for now) */
  quote(input: QuoteInput): Promise<QuoteResult>;
  /** Execute a plain swap (mock tx id for now) */
  swap(input: QuoteInput & { walletId: string }): Promise<{ txId: string; note?: string }>;
}
