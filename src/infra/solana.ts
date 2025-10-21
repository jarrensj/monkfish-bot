// Minimal Solana RPC helpers for reading on-chain data

import { Connection, PublicKey } from "@solana/web3.js";

const DEFAULT_RPC =
  process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

let _conn: Connection | null = null;

// Get or create singleton RPC connection
export function getConnection(): Connection {
  if (_conn) return _conn;
  _conn = new Connection(DEFAULT_RPC, "confirmed");
  return _conn;
}

// Fetch SOL balance for a given address, returns 0 on error
export async function getSolBalance(address: string): Promise<number> {
  try {
    const lamports = await getConnection().getBalance(new PublicKey(address));
    return lamports / 1e9; // Convert lamports to SOL
  } catch {
    // If RPC is missing or fails, don't throw on Day 1
    return 0;
  }
}