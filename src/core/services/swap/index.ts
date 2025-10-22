import type { ISwapService } from "./types";
import { MockSwapService } from "./local";
import { RestSwapService } from "./rest";

export function makeSwapService(): ISwapService {
  const provider = (process.env.SWAP_PROVIDER || "development").toLowerCase();
  if (provider === "http") {
    const url = process.env.KOI_API_URL;
    if (!url) throw new Error("SWAP_PROVIDER=http but KOI_API_URL is not set");
    return new RestSwapService(url);
  }
  return new MockSwapService();
}
