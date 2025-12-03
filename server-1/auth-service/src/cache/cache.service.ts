
// ============================================
// src/cache/cache.service.ts - OPTIMIZED VERSION
// ============================================
import { RedisConnection } from '../config/redis.config';

export class CacheService {
  private static instance: CacheService;
  private redis: any;
  private enabled: boolean = true;

  private constructor() {
    try {
      this.redis = RedisConnection.getInstance().getClient();
    } catch (error) {
      console.warn('⚠️ Redis not available, caching disabled');
      this.enabled = false;
    }
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.warn('⚠️ Redis unavailable, falling back to database');
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;

    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      if (typeof data === 'string') {
        return JSON.parse(data) as T;
      }
      return data as T;
    } catch (error) {
      console.error(`❌ Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await this.redis.set(key, serialized, { EX: ttl });
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`❌ Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`❌ Redis DELETE error for key ${key}:`, error);
      return false;
    }
  }

  // ✅ NEW: Batch delete (replaces deletePattern for most cases)
  async deleteBatch(keys: string[]): Promise<number> {
    if (!this.enabled || keys.length === 0) return 0;

    try {
      // Use pipeline for better performance
      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      const results = await pipeline.exec();

      return results.filter((r: any) => r[1] === 1).length;
    } catch (error) {
      console.error(`❌ Redis BATCH DELETE error:`, error);
      return 0;
    }
  }

  // ⚠️ DANGEROUS: Only use when absolutely necessary
  // Use deleteBatch() with explicit keys instead
  async deletePattern(pattern: string): Promise<number> {
    if (!this.enabled) return 0;

    console.warn(`⚠️ deletePattern() called with: ${pattern} - Consider using deleteBatch()`);

    try {
      // Use SCAN instead of KEYS for production safety
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [newCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH', pattern,
          'COUNT', 100
        );

        cursor = newCursor;

        if (keys.length > 0) {
          deletedCount += await this.deleteBatch(keys);
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch (error) {
      console.error(`❌ Redis DELETE PATTERN error for ${pattern}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`❌ Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      await this.redis.expire(key, ttl);
      return true;
    } catch (error) {
      console.error(`❌ Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  async acquireLock(key: string, ttl: number = 10000): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const lockKey = `lock:${key}`;
      const lockValue = Date.now().toString();

      const acquired = await this.redis.set(lockKey, lockValue, {
        NX: true,
        PX: ttl,
      });

      return acquired === 'OK';
    } catch (error) {
      console.error(`❌ Lock acquisition error for ${key}:`, error);
      return false;
    }
  }

  async releaseLock(key: string): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const lockKey = `lock:${key}`;
      await this.redis.del(lockKey);
      return true;
    } catch (error) {
      console.error(`❌ Lock release error for ${key}:`, error);
      return false;
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();

    // Non-blocking cache set
    this.set(key, data, ttl).catch(err =>
      console.error(`Failed to cache ${key}:`, err)
    );

    return data;
  }

  async getOrSetWithLock<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600,
    lockTTL: number = 5000
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const lockAcquired = await this.acquireLock(key, lockTTL);

    if (!lockAcquired) {
      await this.sleep(100);
      const retryCache = await this.get<T>(key);
      if (retryCache !== null) {
        return retryCache;
      }
      return await fetcher();
    }

    try {
      const doubleCheck = await this.get<T>(key);
      if (doubleCheck !== null) {
        return doubleCheck;
      }

      const data = await fetcher();
      await this.set(key, data, ttl);

      return data;
    } finally {
      await this.releaseLock(key);
    }
  }

  // ✅ NEW: Batch get operation
  async getBatch<T>(keys: string[]): Promise<Map<string, T>> {
    if (!this.enabled || keys.length === 0) return new Map();

    try {
      const results = await this.redis.mget(...keys);
      const map = new Map<string, T>();

      results.forEach((value: string | null, index: number) => {
        if (value) {
          try {
            const key = keys[index];
            if (key) {
              map.set(key, JSON.parse(value) as T);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      });

      return map;
    } catch (error) {
      console.error(`❌ Redis BATCH GET error:`, error);
      return new Map();
    }
  }

  // ✅ NEW: Batch set operation
  async setBatch(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    if (!this.enabled || entries.length === 0) return false;

    try {
      const pipeline = this.redis.pipeline();

      entries.forEach(({ key, value, ttl = 3600 }) => {
        const serialized = JSON.stringify(value);
        if (ttl > 0) {
          pipeline.set(key, serialized, { EX: ttl });
        } else {
          pipeline.set(key, serialized);
        }
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error(`❌ Redis BATCH SET error:`, error);
      return false;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    if (!this.enabled) return 0;

    try {
      const result = await this.redis.incrBy(key, amount);
      return result;
    } catch (error) {
      console.error(`❌ Redis INCREMENT error for ${key}:`, error);
      return 0;
    }
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    if (!this.enabled) return 0;

    try {
      const result = await this.redis.decrBy(key, amount);
      return result;
    } catch (error) {
      console.error(`❌ Redis DECREMENT error for ${key}:`, error);
      return 0;
    }
  }

  async flushAll(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      await this.redis.flushdb();
      console.log('🗑️ Redis cache flushed');
      return true;
    } catch (error) {
      console.error('❌ Redis FLUSH error:', error);
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`✅ Redis caching ${enabled ? 'enabled' : 'disabled'}`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}