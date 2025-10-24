import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase client singleton
let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
      );
    }

    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('[supabase] Service role client initialized');
  }

  return supabase;
}

(async () => {
  try {
    // Ensure env is loaded before this file is imported:
    // import "dotenv/config" should run in your main entry first.
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("users").select("telegram_id").limit(1);
    if (error) {
      console.error("[supabase] RLS/Key check failed:", error);
      throw new Error(
        "Supabase client is NOT using service_role. Set SUPABASE_SERVICE_ROLE_KEY."
      );
    }
    console.log("[supabase] RLS/Key check OK (service_role active)");
  } catch (e) {
    console.error(e);
    process.exit(1); // fail fast
  }
})();


// Database types
export interface DbUser {
  telegram_id: string;
  tos_agreed: boolean;
  tos_version: string | null;
  tos_agreed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWallet {
  id: string;
  user_telegram_id: string;
  address: string;
  private_key_encrypted: string | null;
  created_at: string;
}

// Insert types (without auto-generated fields)
export interface DbUserInsert {
  telegram_id: string;
  tos_agreed: boolean;
  tos_version: string | null;
  tos_agreed_at: string | null;
}

export interface DbWalletInsert {
  id: string;
  user_telegram_id: string;
  address: string;
  private_key_encrypted?: string | null;
}