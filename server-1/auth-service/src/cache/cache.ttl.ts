
/**
 * ✅ OPTIMIZED TTL VALUES
 * - Increased TTL for stable data (less cache misses)
 * - Reduced TTL for volatile data (prevent stale data)
 * - Better aligned with data change frequency
 */
export class CacheTTL {
  // ========== AUTH & SESSIONS ==========
  static readonly TOKEN_DECODED = 600;        
  static readonly TOKEN_BLACKLIST = 604800;  
  static readonly SESSION = 1800;             
  static readonly USER_DATA = 3600;           
  // ========== GENERIC ==========
  static readonly SHORT = 60;                 // ✅ 1 minute
  static readonly MEDIUM = 300;               // ✅ 5 minutes
  static readonly LONG = 900;                 // ✅ 15 minutes
  static readonly HOUR = 3600;                // ✅ 1 hour
  static readonly DAY = 86400;                // ✅ 24 hours
}