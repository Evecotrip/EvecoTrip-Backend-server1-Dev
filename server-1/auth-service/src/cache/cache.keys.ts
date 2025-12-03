// ============================================
//  src/cache/cache.keys.ts
// ============================================

/**
 * Centralized cache key management for MLM platform
 */
export class CacheKeys {
  // ========== USER & AUTH ==========
  static user = {
    byId: (userId: string) => `user:${userId}`,
    byClerkId: (clerkUid: string) => `user:clerk:${clerkUid}`,
    byEmail: (email: string) => `user:email:${email}`,
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

}