/**
 * Swap Commands (chain-agnostic UI; backend decides/validates final chain)
 *
 * Supported <assetOrAddress> inputs:
 *  1) Raw address/mint                      → EPjF...Dt1v, 0x...
 *  2) chain:address                         → sol:EPjF...Dt1v, eth:0x...
 *  3) symbol:chain (backend registry)       → usdc:sol, usdc:eth
 *  4) symbol only (backend resolves or asks)→ usdc
 *
 * Commands:
 *  - /quote <assetOrAddress> <amount>  → calls backend via koiApi (no local fallback)
 *  - /swap  <assetOrAddress> <amount>  → calls backend via koiApi
 *
 * All replies use parse_mode: "HTML".
 * Every backend call includes Telegram user info for attribution & auth.
 */

import type { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import {
  isTextMessage,
  replyHTML,
  editHTML,
  escapeHtml as escHtml,
  looksLikeSymbol,
  addressHeuristic,
  parsePositiveAmount,
  formatAmount,
  underCooldown,
} from "./utils";
import {
  resolveAssetForBackend,
  type ResolveOK,
  buildAmbiguityHelpHTML,
} from "./utils/resolver";
import { koiApi } from "../../clients";
import { ensureTosAccepted } from "../middleware/tosGate";

const MAX_ASSET_LEN = 128;

// Ensure env is set once on boot (fail-fast)
const KOI_API_URL = process.env.KOI_API_URL?.replace(/\/+$/, "");
if (!KOI_API_URL) {
  // eslint-disable-next-line no-console
  console.warn("[swapCommands] KOI_API_URL not set; commands will reply with guidance.");
}

// --- Commands ------------------------------------------------------------

export function registerSwapCommands(bot: Telegraf) {
  // /quote <assetOrAddress> <amount>  (backend only)
  bot.command("quote", async (ctx) => {
    try {
      if (!isTextMessage(ctx)) return;

      // anti-spam (per-user)
      const cdKey = `quote:${ctx.from?.id ?? "anon"}`;
      if (!(await ensureTosAccepted(ctx))) return;
      if (underCooldown(cdKey, 1200)) return;

      const [, rawAsset, amountRaw] = ctx.message.text.trim().split(/\s+/);

      if (!rawAsset || !amountRaw) {
        return replyHTML(ctx, "Usage: /quote &lt;assetOrAddress&gt; &lt;amount&gt;<br/>Example: /quote usdc:sol 0.5");
      }
      if (rawAsset.length > MAX_ASSET_LEN) {
        return replyHTML(ctx, "Asset input is too long.");
      }

      const amountIn = parsePositiveAmount(amountRaw, 9);
      if (amountIn == null) {
        return replyHTML(ctx, "Amount must be a number greater than 0.");
      }

      if (!KOI_API_URL) {
        return replyHTML(ctx, "❌ <b>Quote disabled</b><br/><code>KOI_API_URL</code> is not set.");
      }

      // Normalize/resolve (symbol:chain, raw, etc.)
      const resolved = await resolveAssetForBackend(rawAsset, { koiApiUrl: KOI_API_URL });
      if (!resolved.ok) {
        return replyHTML(ctx, buildAmbiguityHelpHTML(rawAsset, resolved));
      }
      const { address, chain, noteHTML } = resolved as ResolveOK;

      const loading = await replyHTML(ctx, "🔍 Getting quote…") as any;

      // SECURE: include Telegram user identity in meta
      const q = await koiApi.quote(address, amountIn, {
        userId: ctx.from?.id,
        command: "quote",
        traceId: String(ctx.message.message_id),
      });

      const lines = [
        "📊 <b>Quote</b>",
        `• Asset: <code>${escHtml(address)}</code>${chain ? ` (${escHtml(chain)})` : ""}`,
        noteHTML ? `• ${noteHTML}` : "",
        `• Spend: ${formatAmount(amountIn)}`,
        `• Est. out: ~${formatAmount(q.estOut ?? 0, 6)}`,
        q.impactPct != null ? `• Impact: ${(q.impactPct * 100).toFixed(2)}%` : "",
        q.hops != null ? `• Route: ${q.hops} hops` : "",
        q.source ? `• Source: ${escHtml(q.source)}` : "",
        q.risk?.honeypot ? "⚠️ <b>Honeypot risk detected</b>" : "",
        q.risk?.notes ? `• ${escHtml(q.risk.notes)}` : "",
        "",
        `Run it: <code>/swap ${escHtml(rawAsset)} ${formatAmount(amountIn)}</code>`,
      ].filter(Boolean).join("\n");

      await editHTML(ctx, loading.message_id, lines);
    } catch (e: any) {
      await replyHTML(
        ctx,
        `❌ <b>Quote failed</b><br/><code>${escHtml(e?.message || "unknown error")}</code>`
      );
    }
  });

  // /swap <assetOrAddress> <amount> → execute via backend
  bot.command("swap", async (ctx) => {
    try {
      if (!(await ensureTosAccepted(ctx))) return;
      if (!isTextMessage(ctx)) return;

      const cdKey = `swap:${ctx.from?.id ?? "anon"}`;
      if (underCooldown(cdKey, 1500)) return;

      const parts = ctx.message.text.trim().split(/\s+/);
      const rawAsset = parts[1];
      const amountRaw = parts[2];

      if (!rawAsset || !amountRaw) {
        return replyHTML(ctx, "Usage: /swap &lt;assetOrAddress&gt; &lt;amount&gt;<br/>Example: /swap usdc:sol 0.5");
      }
      if (rawAsset.length > MAX_ASSET_LEN) {
        return replyHTML(ctx, "Asset input is too long.");
      }

      const amountIn = parsePositiveAmount(amountRaw, 9);
      if (amountIn == null) {
        return replyHTML(ctx, "Amount must be a number greater than 0.");
      }

      if (!KOI_API_URL) {
        return replyHTML(ctx, "❌ <b>Swap disabled</b><br/><code>KOI_API_URL</code> is not set.");
      }

      const resolved = await resolveAssetForBackend(rawAsset, { koiApiUrl: KOI_API_URL });
      if (!resolved.ok) {
        return replyHTML(ctx, buildAmbiguityHelpHTML(rawAsset, resolved));
      }
      const { address, chain, noteHTML } = resolved as ResolveOK;

      const loading = await replyHTML(ctx, "⚡ Executing swap…") as any;

      // SECURE: include Telegram user identity in meta
      const r = await koiApi.swap(address, amountIn, {
        userId: ctx.from?.id,
        command: "swap",
        traceId: String(ctx.message.message_id),
      });

      const out = typeof r.estimatedOut === "number" ? formatAmount(r.estimatedOut, 6) : undefined;

      const html = [
        `✅ <b>Swap submitted!</b>`,
        `• Asset: <code>${escHtml(address)}</code>${chain ? ` (${escHtml(chain)})` : ""}`,
        noteHTML ? `• ${noteHTML}` : "",
        r.txId ? `• tx: <code>${escHtml(r.txId)}</code>` : "",
        out ? `• estOut: ~<code>${escHtml(out)}</code>` : "",
      ].filter(Boolean).join("\n");

      await editHTML(ctx, loading.message_id, html);
    } catch (e: any) {
      await replyHTML(
        ctx,
        `❌ <b>Swap failed</b><br/><code>${escHtml(e?.message || "unknown error")}</code>`
      );
    }
  });

  // Text-only auto-suggestion
  bot.on(message("text"), async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text || text.startsWith("/")) return;

    const symbolish = looksLikeSymbol(text);
    const addressish = addressHeuristic(text);
    if (!(symbolish || addressish)) return;
    if (text.length > MAX_ASSET_LEN) return;

    await replyHTML(
      ctx,
      [
        `Detected token input: ${escHtml(text)}`,
        `Try:`,
        `• /quote ${escHtml(text)} 0.05`,
        `• /swap ${escHtml(text)} 0.05`,
        symbolish ? `\nTip: prefer the canonical address, or use <code>symbol:chain</code> like <code>usdc:sol</code>.` : "",
      ].join("\n")
    );
  });
}
