import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase client singleton
let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
      );
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[supabase] Client initialized');
  }

  return supabase;
}

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

