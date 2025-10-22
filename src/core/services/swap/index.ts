import type { ISwapService } from "./types";
import { MockSwapService } from "./mock";

/** Factory: switch to a real adapter later via env (e.g., SWAP_PROVIDER=jupiter) */
export function makeSwapService(): ISwapService {
  // Example future switch:
  // if (process.env.SWAP_PROVIDER === "jupiter") return new JupiterSwapService(...);
  return new MockSwapService();
}
