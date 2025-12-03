// ============================================
// src/config/redis.config.ts
// Upstash Redis configuration (HTTP-based)
// ============================================
import { Redis } from '@upstash/redis';
import { getEnv } from './env.config';

export class RedisConnection {
  private static instance: RedisConnection;
  private client: Redis;

  private constructor() {
    console.log('🔌 Initializing Upstash Redis client...');

    this.client = new Redis({
      url: getEnv.redis.url(),
      token: getEnv.redis.token(),
    });

    console.log('✅ Upstash Redis client initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  /**
   * Get Redis client
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Test connection (HTTP-based, so just ping)
   */
  async connect(): Promise<void> {
    try {
      const response = await this.client.ping();
      console.log('✅ Upstash Redis PING response:', response);
    } catch (error: any) {
      console.error('❌ Failed to connect to Upstash Redis:', error.message);
      console.warn('⚠️  Application will continue without Redis');
      throw error;
    }
  }

  /**
   * Disconnect (no-op for HTTP-based Redis)
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Upstash Redis client closed (HTTP-based, no persistent connection)');
  }

  /**
   * Check if Redis is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Redis connection info
   */
  async getRedisInfo(): Promise<{
    connected: boolean;
    type: string;
    version?: string;
  }> {
    try {
      const connected = await this.isConnected();
      return {
        connected,
        type: 'Upstash Redis (HTTP)',
        version: 'N/A', // Upstash doesn't expose this via REST
      };
    } catch (error: any) {
      console.error('❌ Error getting Redis info:', error.message);
      return {
        connected: false,
        type: 'Upstash Redis (HTTP)',
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.isConnected();
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const redis = RedisConnection.getInstance().getClient();