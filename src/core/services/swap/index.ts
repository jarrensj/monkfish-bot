import type { ISwapService } from "./types";
import { CadenceSwapService } from "./rest";

/** Factory — always REST (we’re live-only now). */
export function makeSwapService(): ISwapService {
  return new CadenceSwapService();
}

export * from "./types";
