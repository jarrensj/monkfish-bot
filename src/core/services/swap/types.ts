export type SwapInput = {
  /** SPL mint address (base58, 32–44 chars). */
  mint: string;
  /** Exact-in amount in SOL. */
  amountSOL: number;
  /** Optional: slippage (bps). If omitted, backend/env decides. */
  slippageBps?: number;
  /** Optional: priority fee in microlamports. If omitted, backend/env decides. */
  priorityFee?: number;
};

export type SwapResult = {
  /** Solana transaction signature (for Solscan). */
  txId: string;
  /** Estimated out amount in human units (if provided by backend). */
  estimatedOut?: number;
  /** Raw backend payload for debugging or future UI. */
  raw?: any;
};

export interface ISwapService {
  /** Execute a live SOL -> SPL token swap. */
  swap(input: SwapInput): Promise<SwapResult>;
}
