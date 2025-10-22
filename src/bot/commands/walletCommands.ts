// Wallet-related bot commands (start, deposit, balance)
import type { Telegraf, Context } from "telegraf";
import { logErr } from "./utils"
import type { IWalletService } from "../../core/services/wallet/types";
import { keyValue } from "../../infra/keyValue";

type Bot = Telegraf<Context>;

// Current Terms of Service version
const CURRENT_TOS_VERSION = "1.0.0-beta";

export function registerWalletCommands(bot: Bot, wallet: IWalletService) {
    // Helper function to check if user needs to accept/re-accept ToS
    function needsTosAcceptance(tg: string): boolean {
        const hasAgreed = keyValue.get<boolean>(`user:${tg}:tos_agreed`, false);
        if (!hasAgreed) return true;
        
        // Check if user's ToS version matches current version
        const userTosVersion = keyValue.get<string>(`user:${tg}:tos_version`);
        return userTosVersion !== CURRENT_TOS_VERSION;
    }

    // Initial /start command - show welcome and ToS
    bot.start(async (ctx: Context) => {
        const tg = String(ctx.from!.id);
        const needsAcceptance = needsTosAcceptance(tg);

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
            const userTosVersion = keyValue.get<string>(`user:${tg}:tos_version`);
            const isUpdate = userTosVersion && userTosVersion !== CURRENT_TOS_VERSION;
            
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
        const tg = String(ctx.from!.id);
        const agreedAt = new Date().toISOString();
        
        // TODO: Migrate to DB - Store as single user record with ToS fields
        // Instead of 3 separate KV entries, should be:
        // Users table: { telegram_id, tos_agreed, tos_version, tos_agreed_at, created_at, updated_at }
        keyValue.set(`user:${tg}:tos_agreed`, true);
        keyValue.set(`user:${tg}:tos_version`, CURRENT_TOS_VERSION);
        keyValue.set(`user:${tg}:tos_agreed_at`, agreedAt);
        
        await ctx.reply(
            "✅ Terms accepted!\n\n" +
            "Now use /start_wallet to create your wallet."
        );
    });

    // User declines ToS
    bot.command("cancel", async (ctx: Context) => {
        await ctx.reply("No problem! You can return anytime with /start");
    });

    // Create wallet - only works after ToS agreement
    bot.command("start_wallet", async (ctx: Context) => {
        try {
            const tg = String(ctx.from!.id);

            if (needsTosAcceptance(tg)) {
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

    // Show user's deposit address (requires ToS + wallet)
    bot.command("deposit", async (ctx: Context) => {
        try {
            const tg = String(ctx.from!.id);

            if (needsTosAcceptance(tg)) {
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

    // Display current wallet balances (requires ToS + wallet)
    bot.command("balance", async (ctx: Context) => {
        try {
            const tg = String(ctx.from!.id);

            if (needsTosAcceptance(tg)) {
                await ctx.reply("Please accept the current Terms of Service first. Use /start to begin.");
                return;
            }

            const { walletId } = await wallet.getOrCreateUserWallet(tg);
            const b = await wallet.getBalances(walletId);
            await ctx.reply(`💰 Balances\n• SOL: ${b.SOL.toFixed(4)}`);
        } catch (err) {
            logErr("Wallet creation failed", err, { tg: String(ctx.from!.id) });
            await ctx.reply("Couldn't fetch your balance right now. Please try again.");
        }
    });
}