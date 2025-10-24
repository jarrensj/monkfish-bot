// Database service layer for Users and Wallets
import { getSupabaseClient, type DbUser, type DbUserInsert, type DbWallet, type DbWalletInsert } from './supabase';

/**
 * User database operations
 */
export const userDb = {
  /**
   * Get user by telegram ID
   */
  async getUser(telegramId: string): Promise<DbUser | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('[userDb] getUser error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create or update user
   */
  async upsertUser(user: DbUserInsert): Promise<DbUser> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .upsert(user, { onConflict: 'telegram_id' })
      .select()
      .single();

    if (error) {
      console.error('[userDb] upsertUser error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Update ToS acceptance for a user
   */
  async updateTosAcceptance(
    telegramId: string,
    tosVersion: string,
    agreedAt: string
  ): Promise<DbUser> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          telegram_id: telegramId,
          tos_agreed: true,
          tos_version: tosVersion,
          tos_agreed_at: agreedAt,
        },
        { onConflict: 'telegram_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[userDb] updateTosAcceptance error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Check if user needs to accept/re-accept ToS
   */
  async needsTosAcceptance(telegramId: string, currentVersion: string): Promise<boolean> {
    const user = await this.getUser(telegramId);
    
    if (!user || !user.tos_agreed) {
      return true;
    }

    return user.tos_version !== currentVersion;
  },
};

/**
 * Wallet database operations
 */
export const walletDb = {
  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<DbWallet | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('[walletDb] getWallet error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get wallet by user telegram ID
   */
  async getWalletByUserId(telegramId: string): Promise<DbWallet | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_telegram_id', telegramId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('[walletDb] getWalletByUserId error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create a new wallet
   */
  async createWallet(wallet: DbWalletInsert): Promise<DbWallet> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('wallets')
      .insert(wallet)
      .select()
      .single();

    if (error) {
      console.error('[walletDb] createWallet error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Get all wallets for a user (in case they have multiple in the future)
   */
  async getWalletsByUserId(telegramId: string): Promise<DbWallet[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_telegram_id', telegramId);

    if (error) {
      console.error('[walletDb] getWalletsByUserId error:', error);
      throw error;
    }

    return data || [];
  },
};