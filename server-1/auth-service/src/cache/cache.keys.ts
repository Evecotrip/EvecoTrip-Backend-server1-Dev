// // ============================================
// //  src/cache/cache.keys.ts
// // ============================================

// /**
//  * Centralized cache key management for MLM platform
//  */
// export class CacheKeys {
//   // ========== USER & AUTH ==========
//   static user = {
//     byId: (userId: string) => `user:${userId}`,
//     byClerkId: (clerkUid: string) => `user:clerk:${clerkUid}`,
//     byEmail: (email: string) => `user:email:${email}`,
//     profile: (userId: string) => `user:${userId}:profile`,
//     permissions: (userId: string) => `user:${userId}:permissions`,
//     pattern: () => 'user:*',
//   };

//   // ========== JWT TOKEN CACHE ==========
//   static token = {
//     // Cache decoded token to avoid re-verifying
//     decoded: (tokenHash: string) => `token:${tokenHash}`,
//     blacklist: (tokenHash: string) => `token:blacklist:${tokenHash}`,
//     pattern: () => 'token:*',
//   };

//   // ========== SESSION ==========
//   static session = {
//     byToken: (token: string) => `session:${token}`,
//     byUserId: (userId: string) => `session:user:${userId}`,
//     pattern: () => 'session:*',
//   };

// } 

// ============================================
//  src/cache/cache.keys.ts - UPDATED FOR SUPABASE AUTH
// ============================================

/**
 * Centralized cache key management for EvecoTrip platform
 */
export class CacheKeys {
  // ========== USER & AUTH ==========
  static user = {
    byId: (userId: string) => `user:${userId}`,
    bySupabaseAuthId: (supabaseAuthId: string) => `user:supabase:${supabaseAuthId}`, // ✅ Changed
    byEmail: (email: string) => `user:email:${email}`,
    byPhone: (phone: string) => `user:phone:${phone}`, // ✅ Added
    profile: (userId: string) => `user:${userId}:profile`,
    permissions: (userId: string) => `user:${userId}:permissions`,
    pattern: () => 'user:*',
  };

  // ========== JWT TOKEN CACHE ==========
  static token = {
    // Cache decoded token to avoid re-verifying
    decoded: (tokenHash: string) => `token:${tokenHash}`,
    blacklist: (tokenHash: string) => `token:blacklist:${tokenHash}`,
    pattern: () => 'token:*',
  };

  // ========== SESSION ==========
  static session = {
    byToken: (token: string) => `session:${token}`,
    byUserId: (userId: string) => `session:user:${userId}`,
    pattern: () => 'session:*',
  };

  // ========== OTP (Supabase handles this, but we can cache attempts) ==========
  static otp = {
    attempts: (phone: string) => `otp:attempts:${phone}`,
    lastSent: (phone: string) => `otp:last_sent:${phone}`,
  };
}