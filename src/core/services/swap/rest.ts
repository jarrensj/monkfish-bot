import type { ISwapService, SwapInput, SwapResult } from "./types";

const KOI_API_URL = (process.env.KOI_API_URL || "http://localhost:3001").replace(/\/+$/, "");
const PATH = "/api/algo/cadence-trader";
const DEFAULT_SLIPPAGE_BPS = Number(process.env.SLIPPAGE_BPS ?? 100);
const DEFAULT_PRIORITY_FEE = Number(process.env.PRIORITY_FEE_MICROLAMPORTS ?? 0);

// TODO(SECURITY): add KOI_API_KEY bearer once backend enforces it.
// TODO(PRIVY): when per-user wallets land, populate public_wallet with the user's wallet.

function assertMint(mint: string) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    throw new Error("Invalid mint address format.");
  }
}

async function postJson<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${KOI_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.KOI_API_KEY ? { Authorization: `Bearer ${process.env.KOI_API_KEY}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { /* leave undefined */ }

  if (!res.ok || json?.success === false) {
    // Surface Zod issues if present
    const issues = json?.issues ? `\nissues: ${JSON.stringify(json.issues)}` : "";
    const msg = (json?.error || text || `HTTP ${res.status}`) + issues;
    throw new Error(msg);
  }
  return json as T;
}

export class CadenceSwapService implements ISwapService {
  async swap(input: SwapInput): Promise<SwapResult> {
    const mint = (input.mint || "").trim();
    assertMint(mint);

    const amountSOL = Number(input.amountSOL);
    if (!(amountSOL > 0)) throw new Error("amountSOL must be > 0");

    // IMPORTANT: Backend likely requires public_wallet in schema
    // Set this env to the backend signer pubkey (base58) for now.
    // Later, when using Privy per-user wallets, this should be the user's wallet.
    const public_wallet = (process.env.BOT_PUBLIC_WALLET || "").trim() || "server";

    const payload = {
      public_wallet,            // <— added
      sellToken: "SOL",
      buyToken: mint,
      blockchain: "sol",
      amount: amountSOL,
      dryRun: false,
      slippageBps: input.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
      priorityFee: input.priorityFee ?? DEFAULT_PRIORITY_FEE,
    };

    const r = await postJson<any>(PATH, payload);

    const txId: string = r?.transactionSignature || r?.tx || "UNKNOWN";
    const estimatedOut =
      typeof r?.estOut === "number"
        ? r.estOut
        : (typeof r?.quote?.outAmount === "string" ? Number(r.quote.outAmount) / 1e6 : undefined);

    return { txId, estimatedOut, raw: r };
  }
}
