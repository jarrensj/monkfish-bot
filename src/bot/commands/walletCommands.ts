// Wallet-related bot commands (start, deposit, balance)
import type { Telegraf, Context } from "telegraf";
import { logErr } from "./utils";
import type { IWalletService } from "../../core/services/wallet/types";
import { userDb } from "../../infra/database";

type Bot = Telegraf<Context>;

// Current Terms of Service version
const CURRENT_TOS_VERSION = "1.0.0-beta";

function escHtml(s: string) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

// Backend KOI_API_URL (dev-friendly default)
// NOTE: For production, use HTTPS and a real domain.
// TODO(SECURITY): Add KOI_API_KEY bearer on the backend and send it from the bot.
const KOI_API_URL = (process.env.KOI_API_URL || "http://localhost:3001").replace(/\/+$/, "");

// TODO(SECURITY): Protect this backend endpoint with KOI_API_KEY middleware.
// When enabled server-side, send the Authorization header below.
async function getServerBalance(): Promise<{ ok: boolean; address?: string; SOL?: number; error?: string }> {
    const res = await fetch(`${KOI_API_URL}/api/tg/wallet/balance`, {
        headers: {
            ...(process.env.KOI_API_KEY ? { Authorization: `Bearer ${process.env.KOI_API_KEY}` } : {}),
        },
    });
    const txt = await res.text();
    try { return JSON.parse(txt); } catch { return { ok: false, error: txt || `HTTP ${res.status}` }; }
}

/**
 * ✅ MIGRATED: Now uses Supabase DB with proper wallet storage
 * Wallets table: { id, user_telegram_id (FK to Users), address, private_key_encrypted, created_at }
 * Users table: { telegram_id, tos_agreed, tos_version, tos_agreed_at, created_at, updated_at }
 * This allows proper relational queries, transactions, and secure key storage
 *
 * NOTE: For now we use a local/dev wallet service that returns a fake but stable address per user,
 * just so /start_wallet and /deposit flows are functional during development.
 * Replace with Privy-backed REST in WALLET_MODE=http once backend routes exist.
 */
export function registerWalletCommands(bot: Bot, wallet: IWalletService) {
    // Helper function to check if user needs to accept/re-accept ToS
    async function needsTosAcceptance(tg: string): Promise<boolean> {
        try {
            return await userDb.needsTosAcceptance(tg, CURRENT_TOS_VERSION);
        } catch (err) {
            console.error('[walletCommands] needsTosAcceptance error:', err);
            // On error, require ToS acceptance to be safe
            return true;
        }
    }

    // Initial /start command - show welcome and ToS
    bot.start(async (ctx: Context) => {
        const tg = String(ctx.from!.id);
        const needsAcceptance = await needsTosAcceptance(tg);

        if (!needsAcceptance) {
            // User already agreed to current ToS version, show main menu
            await ctx.reply(
                "Welcome back to Monkfish 🐟\n\n" +
                "Commands:\n" +
                "• /start_wallet - Create/view your wallet\n" +
                "• /deposit - View deposit address\n" +
                "• /balance - Check your balance"
            );
        } else {
            // First time user or ToS version updated - show ToS
            const user = await userDb.getUser(tg);
            const isUpdate = user && user.tos_version && user.tos_version !== CURRENT_TOS_VERSION;

            const greeting = isUpdate
                ? "📋 Our Terms of Service have been updated!\n\n"
                : "Welcome to Monkfish 🐟\n\n";

            await ctx.reply(
                greeting +
                "Before you begin, please review our Terms of Service:\n\n" +
                "• This is a non-custodial wallet bot\n" +
                "• You are responsible for your funds\n" +
                "• Transactions on Solana are irreversible\n" +
                "• Use at your own risk\n\n" +
                "Type /agree to accept and continue, or /cancel to exit."
            );
        }
    });

    // User agrees to ToS
    bot.command("agree", async (ctx: Context) => {
        try {
            const tg = String(ctx.from!.id);
            const agreedAt = new Date().toISOString();

            /**
             * ✅ MIGRATED: Store as single user record with ToS fields in Supabase
             * Users table: { telegram_id, tos_agreed, tos_version, tos_agreed_at, created_at, updated_at }
             */
            await userDb.updateTosAcceptance(tg, CURRENT_TOS_VERSION, agreedAt);

            await ctx.reply("✅ Terms accepted!\n\nNow use /start_wallet to create your wallet.");
        } catch (err) {
            logErr("ToS acceptance failed", err, { tg: String(ctx.from!.id) });
            await ctx.reply("Something went wrong. Please try again.");
        }
    });

    // User declines ToS
    bot.command("cancel", async (ctx: Context) => {
        await ctx.reply("No problem! You can return anytime with /start");
    });

    // Create wallet - only works after ToS agreement
    bot.command("start_wallet", async (ctx: Context) => {
        try {
            const tg = String(ctx.from!.id);

            if (await needsTosAcceptance(tg)) {
                await ctx.reply("Please accept the current Terms of Service first. Use /start to begin.");
                return;
            }

            const { address } = await wallet.getOrCreateUserWallet(tg);
            await ctx.reply(
                [
                    "🐟 Your Monkfish wallet is ready!",
                    `\nDeposit address:\n${address}`,
                    "\nCommands:",
                    "• /deposit - View deposit address again",
                    "• /balance - Check your balance",
                ].join("\n")
            );
        } catch (err) {
            logErr("Wallet creation failed", err, { tg: String(ctx.from!.id) });
            await ctx.reply("Something went wrong setting up your wallet. Try again.");
        }
    });

    /**
     * TODO: Connect to wallet on Privy (backend koi-fish)
     * - When WALLET_MODE=http and backend has /wallets/* routes,
     *   this should return the user's real deposit address (not a fake dev one).
     */
    bot.command("deposit", async (ctx: Context) => {
        try {
            const tg = String(ctx.from!.id);

            if (await needsTosAcceptance(tg)) {
                await ctx.reply("Please accept the current Terms of Service first. Use /start to begin.");
                return;
            }

            const { address } = await wallet.getOrCreateUserWallet(tg);
            await ctx.reply(`Deposit address:\n${address}\n\nSend SOL here to fund your wallet.`);
        } catch (err) {
            logErr("Wallet creation failed", err, { tg: String(ctx.from!.id) });
            await ctx.reply("Couldn't fetch your deposit address. Try /start_wallet first.");
        }
    });

    /**
     * TODO: Update to point to Privy user wallets once integrated.
     * For now, /balance calls a backend helper route that reports the server's signer wallet balance
     * (the wallet currently used by cadence-trader on your backend).
     *
     * TODO(SECURITY): Protect /api/tg/wallet/balance with KOI_API_KEY on backend and send it here.
     */
    bot.command("balance", async (ctx) => {
        try {
            const r = await getServerBalance();
            if (!r.ok) return ctx.reply(`Couldn't fetch balance: ${r.error || "unknown error"}`);

            const sol = typeof r.SOL === "number" ? r.SOL.toFixed(6) : "n/a";
            await ctx.reply(
                [
                    "💰 <b>Koi (server) wallet</b>",
                    `Address: <code>${escHtml(r.address || "n/a")}</code>`,
                    `SOL: ${escHtml(sol)}`
                ].join("\n"),
                {
                    parse_mode: "HTML",
                    // ❌ disable_web_page_preview: true,
                    // ✅ use link_preview_options instead
                    link_preview_options: { is_disabled: true },
                }
            );
        } catch (err: any) {
            await ctx.reply("Couldn't fetch your balance right now. Please try again.");
        }
    });
}
