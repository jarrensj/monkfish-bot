/** Escape minimal HTML for Telegram parse_mode: "HTML" */
export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (m) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!
  ));
}

/** Format number with fixed decimals, trimming trailing zeros */
export function formatAmount(n: number, decimals = 4): string {
  return Number.isFinite(n) ? Number(n.toFixed(decimals)).toString() : "0";
}
