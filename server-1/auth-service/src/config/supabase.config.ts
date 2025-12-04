// ============================================
// src/config/supabase.config.ts
// Supabase Auth Configuration
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env.config';

class SupabaseConfig {
  private static instance: SupabaseClient;
  private static isInitialized: boolean = false;

  private constructor() {}

  /**
   * Get Supabase client instance (singleton)
   */
  public static getInstance(): SupabaseClient {
    if (!SupabaseConfig.instance) {
      const supabaseUrl = getEnv.supabase.url();
      const supabaseAnonKey = getEnv.supabase.anonKey();

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('❌ SUPABASE_URL or SUPABASE_ANON_KEY is not configured');
      }

      SupabaseConfig.instance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false, // We manage our own tokens
          persistSession: false,   // Server-side, no need to persist
          detectSessionInUrl: false,
        },
      });

      SupabaseConfig.isInitialized = true;
      console.log('✅ Supabase client initialized successfully');
    }

    return SupabaseConfig.instance;
  }

  /**
   * Check if Supabase is ready
   */
  public static isReady(): boolean {
    return SupabaseConfig.isInitialized;
  }

  /**
   * Sign up with phone and OTP
   */
  public static async signUpWithPhone(phone: string): Promise<{ session: any; user: any }> {
    try {
      const supabase = SupabaseConfig.getInstance();

      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });

      if (error) {
        console.error('❌ Supabase phone signup error:', error.message);
        throw new Error(error.message);
      }

      console.log('✅ Supabase OTP sent to phone:', phone);
      return data;
    } catch (error: any) {
      console.error('❌ Error in signUpWithPhone:', error.message);
      throw error;
    }
  }

  /**
   * Verify phone OTP
   */
  public static async verifyPhoneOTP(phone: string, otp: string): Promise<{ session: any; user: any }> {
    try {
      const supabase = SupabaseConfig.getInstance();

      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: 'sms',
      });

      if (error) {
        console.error('❌ Supabase OTP verification error:', error.message);
        throw new Error(error.message);
      }

      console.log('✅ Supabase OTP verified for phone:', phone);
      return data;
    } catch (error: any) {
      console.error('❌ Error in verifyPhoneOTP:', error.message);
      throw error;
    }
  }

  /**
   * Sign in with Google OAuth
   */
  public static async signInWithGoogle(): Promise<{ url: string }> {
    try {
      const supabase = SupabaseConfig.getInstance();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getEnv.app.frontendUrl()}/auth/callback`,
        },
      });

      if (error) {
        console.error('❌ Supabase Google OAuth error:', error.message);
        throw new Error(error.message);
      }

      console.log('✅ Supabase Google OAuth URL generated');
      return { url: data.url };
    } catch (error: any) {
      console.error('❌ Error in signInWithGoogle:', error.message);
      throw error;
    }
  }

  /**
   * Get user by Supabase Auth ID
   */
  public static async getUserById(userId: string): Promise<any> {
    try {
      const supabase = SupabaseConfig.getInstance();

      const { data, error } = await supabase.auth.admin.getUserById(userId);

      if (error) {
        console.error('❌ Supabase get user error:', error.message);
        throw new Error(error.message);
      }

      console.log('✅ Retrieved user from Supabase:', userId);
      return data.user;
    } catch (error: any) {
      console.error('❌ Error in getUserById:', error.message);
      throw error;
    }
  }

  /**
   * Exchange Supabase access token for user data
   */
  public static async getUserFromToken(accessToken: string): Promise<any> {
    try {
      const supabase = SupabaseConfig.getInstance();

      const { data, error } = await supabase.auth.getUser(accessToken);

      if (error) {
        console.error('❌ Supabase token validation error:', error.message);
        throw new Error(error.message);
      }

      console.log('✅ User validated from Supabase token');
      return data.user;
    } catch (error: any) {
      console.error('❌ Error in getUserFromToken:', error.message);
      throw error;
    }
  }

  /**
   * Delete user from Supabase Auth
   */
  public static async deleteUser(userId: string): Promise<void> {
    try {
      const supabase = SupabaseConfig.getInstance();

      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        console.error('❌ Supabase delete user error:', error.message);
        throw new Error(error.message);
      }

      console.log('✅ Deleted user from Supabase:', userId);
    } catch (error: any) {
      console.error('❌ Error in deleteUser:', error.message);
      throw error;
    }
  }

  /**
   * Update user metadata
   */
  public static async updateUserMetadata(userId: string, metadata: Record<string, any>): Promise<void> {
    try {
      const supabase = SupabaseConfig.getInstance();

      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: metadata,
      });

      if (error) {
        console.error('❌ Supabase update metadata error:', error.message);
        throw new Error(error.message);
      }

      console.log('✅ Updated user metadata in Supabase');
    } catch (error: any) {
      console.error('❌ Error in updateUserMetadata:', error.message);
      throw error;
    }
  }

  /**
   * Resend OTP
   */
  public static async resendOTP(phone: string): Promise<void> {
    try {
      const supabase = SupabaseConfig.getInstance();

      const { error } = await supabase.auth.resend({
        type: 'sms',
        phone: phone,
      });

      if (error) {
        console.error('❌ Supabase resend OTP error:', error.message);
        throw new Error(error.message);
      }

      console.log('✅ OTP resent to phone:', phone);
    } catch (error: any) {
      console.error('❌ Error in resendOTP:', error.message);
      throw error;
    }
  }

  /**
   * Health check
   */
  public static async healthCheck(): Promise<boolean> {
    try {
      const supabase = SupabaseConfig.getInstance();
      
      // Try to get session (will return null but won't error if Supabase is working)
      const {  } = await supabase.auth.getSession();
      
      return true;
    } catch (error: any) {
      console.error('❌ Supabase health check failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export default SupabaseConfig;
export const supabaseClient = SupabaseConfig.getInstance();