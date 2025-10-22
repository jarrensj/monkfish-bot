import type { ISwapService } from "./types";
import { MockSwapService } from "./mock";

/** Factory: switch to a real adapter later via env (e.g., SWAP_PROVIDER=jupiter) */
export function makeSwapService(): ISwapService {
  // Example future switch:
  // if (process.env.SWAP_PROVIDER === "jupiter") return new JupiterSwapService(...);
  return new MockSwapService();
}



// // src/core/services/swap/index.ts
// import type { ISwapService } from "./types";
// import { MockSwapService } from "./mock";
// import { RestSwapService } from "./rest";

// export function makeSwapService(): ISwapService {
//   const provider = (process.env.SWAP_PROVIDER || "mock").toLowerCase();
//   if (provider === "http") {
//     const url = process.env.KOI_API_URL;
//     if (!url) throw new Error("SWAP_PROVIDER=http but KOI_API_URL is not set");
//     return new RestSwapService(url);
//   }
//   return new MockSwapService();
// }
