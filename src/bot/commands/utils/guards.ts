/** Token symbol heuristic (2–10 letters) */
export const looksLikeSymbol = (s: string) => /^[A-Za-z]{2,10}$/.test(s);

/** Generic address heuristic (chain-agnostic “addressy” string) */
export const addressHeuristic = (s: string) => /[A-Za-z0-9]{20,}/.test(s);

/** Solana mint format (base58, 32–44 chars) — optional, use only when you need Sol-specific logic */
export const looksLikeMint = (s: string) =>
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);

/** Clamp a numeric string to N decimals and validate > 0 */
export function parsePositiveAmount(input: string, maxDecimals = 9): number | null {
  if (!/^\d+(\.\d+)?$/.test(input)) return null;
  const [iq, id] = input.split(".");
  if (id && id.length > maxDecimals) return null;
  const n = Number(input);
  return n > 0 ? n : null;
}
