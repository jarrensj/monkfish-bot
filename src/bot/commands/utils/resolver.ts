import { escapeHtml as escHtml } from "./format";
import { addressHeuristic, looksLikeSymbol } from "./guards";
import { fetchJson } from "./http";

/** Chains we recognize for hints (extend as you add support) */
const CHAIN_HINTS = ["sol", "eth", "base", "polygon", "arbitrum", "bsc"] as const;
export type ChainHint = typeof CHAIN_HINTS[number];

export type ResolveOK = {
  ok: true;
  /** Canonical address/mint to send to backend swap/quote */
  address: string;
  /** Optional detected/declared chain (for display only) */
  chain?: ChainHint | string;
  /**
   * Optional tiny note to render in HTML (e.g., “resolved via registry” or normalization message)
   * Keep this short; it’s inserted directly into the bot message.
   */
  noteHTML?: string;
};

export type ResolveAmbiguous = {
  ok: false;
  reason: "ambiguous" | "unknown" | "backend_error" | "invalid";
  /** Suggestions for the user, already formatted for rendering, e.g., "usdc:sol", "sol:<mint>" */
  suggestions?: string[];
  /** A short message to show along with suggestions */
  message?: string;
};

export type ResolveResult = ResolveOK | ResolveAmbiguous;

type ResolveOpts = {
  /** If provided, we’ll ask your backend to resolve symbols or verify hints. */
  koiApiUrl?: string;
};

/** Quick tests for chain/address patterns */
const RE_EVM = /^0x[0-9a-fA-F]{40}$/;
const RE_SOL_BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Parse chain:... prefix if present; returns {chain, rest} or null */
function parseChainPrefix(input: string): { chain: string; rest: string } | null {
  const m = /^([a-z0-9_\-]+):(.*)$/i.exec(input.trim());
  if (!m) return null;
  const chain = m[1].toLowerCase();
  const rest = m[2].trim();
  return { chain, rest };
}

/** Build a small suggestion list for ambiguous inputs */
function buildSuggestions(raw: string): string[] {
  const sym = raw.toLowerCase();
  // conservative: suggest explicit chain-hints; you can tailor by popularity
  return CHAIN_HINTS.slice(0, 3).map((c) => `${sym}:${c}`);
}

/** Human-friendly HTML to guide the user when ambiguous/unknown */
export function buildAmbiguityHelpHTML(raw: string, res: ResolveAmbiguous): string {
  const header =
    res.reason === "ambiguous"
      ? "⚠️ <b>Ambiguous asset</b>"
      : res.reason === "unknown"
      ? "❌ <b>Unknown asset</b>"
      : res.reason === "invalid"
      ? "❌ <b>Invalid asset format</b>"
      : "❌ <b>Resolution failed</b>";

  const msg = res.message ? `<br/>${escHtml(res.message)}` : "";
  const sugg =
    res.suggestions && res.suggestions.length
      ? "<br/>Try one of:<br/>" +
        res.suggestions
          .slice(0, 5)
          .map((s) => `• <code>${escHtml(s)}</code>`)
          .join("<br/>")
      : "";

  return `${header}${msg}${sugg}`;
}

/**
 * Resolve user input to a canonical address to pass to your backend swap/quote.
 * Behavior:
 *  - chain:address  → if address looks valid for that chain, return it
 *  - symbol:chain   → if koiApiUrl is provided, call backend resolver; else ambiguous
 *  - raw address    → detect chain by shape and return as-is
 *  - symbol only    → ambiguous; if koiApiUrl is provided, ask backend; else suggest symbol:chain
 */
export async function resolveAssetForBackend(raw: string, opts: ResolveOpts = {}): Promise<ResolveResult> {
  const input = raw.trim();

  // 1) chain:... prefix
  const pref = parseChainPrefix(input);
  if (pref) {
    const chain = pref.chain as ChainHint | string;
    const rest = pref.rest;

    // chain:address
    if (RE_EVM.test(rest) || RE_SOL_BASE58.test(rest)) {
      return { ok: true, address: rest, chain, noteHTML: "address provided with chain hint" };
    }

    // chain:symbol → backend resolution if available
    if (looksLikeSymbol(rest)) {
      if (!opts.koiApiUrl) {
        return {
          ok: false,
          reason: "ambiguous",
          message: `Need to resolve <code>${escHtml(rest)}:${escHtml(chain)}</code> via backend.`,
          suggestions: [`${rest}:${chain}`],
        };
      }
      try {
        const url = `${opts.koiApiUrl}/api/resolve?asset=${encodeURIComponent(`${rest}:${chain}`)}`;
        const data = await fetchJson<any>(url);
        if (data?.ok && typeof data?.address === "string") {
          return {
            ok: true,
            address: data.address,
            chain: data.chain || chain,
            noteHTML: "resolved via registry",
          };
        }
        return {
          ok: false,
          reason: "backend_error",
          message: escHtml(data?.error || "Backend did not return a valid resolution"),
        };
      } catch (e: any) {
        return { ok: false, reason: "backend_error", message: escHtml(e?.message || "Backend resolve error") };
      }
    }

    // chain:<unknown> → invalid format for now
    return { ok: false, reason: "invalid", message: "Expected an address or symbol after the chain hint." };
  }

  // 2) raw address (detect chain by shape)
  if (RE_EVM.test(input) || RE_SOL_BASE58.test(input)) {
    return { ok: true, address: input, noteHTML: "address provided" };
  }

  // 3) symbol only
  if (looksLikeSymbol(input)) {
    if (!opts.koiApiUrl) {
      return {
        ok: false,
        reason: "ambiguous",
        message: "Symbol alone can exist on multiple chains. Use <code>symbol:chain</code> or paste an address.",
        suggestions: buildSuggestions(input),
      };
    }
    try {
      const url = `${opts.koiApiUrl}/api/resolve?asset=${encodeURIComponent(input)}`;
      const data = await fetchJson<any>(url);
      if (data?.ok && typeof data?.address === "string") {
        return {
          ok: true,
          address: data.address,
          chain: data.chain,
          noteHTML: data.disambiguated ? "resolved (disambiguated) via registry" : "resolved via registry",
        };
      }
      // Backend may respond with options for ambiguous symbols
      if (Array.isArray(data?.options) && data.options.length) {
        const suggestions = data.options
          .slice(0, 5)
          .map((o: any) => (typeof o === "string" ? o : `${o?.symbol || input}:${o?.chain || "?"}`));
        return {
          ok: false,
          reason: "ambiguous",
          message: escHtml(data?.error || "Symbol exists on multiple chains."),
          suggestions,
        };
      }
      return {
        ok: false,
        reason: "unknown",
        message: escHtml(data?.error || "Symbol not found in registry."),
      };
    } catch (e: any) {
      return { ok: false, reason: "backend_error", message: escHtml(e?.message || "Backend resolve error") };
    }
  }

  // 4) not address, not symbol → unknown/invalid
  if (addressHeuristic(input)) {
    // looks addressy but failed strict checks
    return { ok: false, reason: "invalid", message: "Address format looks invalid. Paste the full canonical address." };
  }

  return { ok: false, reason: "unknown", message: "Could not interpret the asset input." };
}
