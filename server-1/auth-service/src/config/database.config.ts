import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { getEnv } from './env.config';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

class DatabaseConfig {
  private static instance: PrismaClient;
  private static isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!DatabaseConfig.instance) {
      if (getEnv.isDevelopment() && globalForPrisma.prisma) {
        DatabaseConfig.instance = globalForPrisma.prisma;
        console.log('♻️  Reusing existing Prisma instance');
      } else {
        // Create PostgreSQL connection pool
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });

        // Create Prisma adapter
        const adapter = new PrismaPg(pool);

        // Create Prisma instance with adapter
        DatabaseConfig.instance = new PrismaClient({
          adapter,
          log: getEnv.isDevelopment() ? ['warn', 'error'] : ['error'],
          errorFormat: 'pretty',
        });

        if (getEnv.isDevelopment()) {
          globalForPrisma.prisma = DatabaseConfig.instance;
        }

        console.log('🆕 Created new Prisma instance');
      }
    }

    return DatabaseConfig.instance;
  }

  /**
   * Connect to database
   */
  public static async connect(): Promise<void> {
    try {
      if (DatabaseConfig.isConnected) {
        console.log('ℹ️  Database already connected');
        return;
      }

      const prisma = DatabaseConfig.getInstance();
      await prisma.$connect();
      DatabaseConfig.isConnected = true;
      
      console.log('✅ Database connected successfully (Supabase PostgreSQL)');
    } catch (error: any) {
      console.error('❌ Database connection failed:', error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect from database
   */
  public static async disconnect(): Promise<void> {
    try {
      if (!DatabaseConfig.instance || !DatabaseConfig.isConnected) {
        console.log('ℹ️  Database already disconnected');
        return;
      }

      console.log('🔌 Disconnecting from database...');
      await DatabaseConfig.instance.$disconnect();
      DatabaseConfig.isConnected = false;

      // Clean up global reference in development
      if (getEnv.isDevelopment()) {
        globalForPrisma.prisma = undefined;
      }

      console.log('✅ Database disconnected successfully');
    } catch (error: any) {
      console.error('❌ Database disconnection failed:', error.message);
      throw error;
    }
  }

  /**
   * Health check
   */
  public static async healthCheck(): Promise<boolean> {
    try {
      const prisma = DatabaseConfig.getInstance();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error: any) {
      console.error('❌ Database health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get connection status
   */
  public static getConnectionStatus(): boolean {
    return DatabaseConfig.isConnected;
  }

  /**
   * Execute raw query (for debugging)
   */
  public static async executeRaw(query: string): Promise<any> {
    try {
      const prisma = DatabaseConfig.getInstance();
      const result = await prisma.$queryRawUnsafe(query);
      return result;
    } catch (error: any) {
      console.error('❌ Raw query failed:', error.message);
      throw error;
    }
  }

  /**
   * Force cleanup - useful for testing or manual intervention
   * This completely destroys the instance and removes it from global
   */
  public static async forceCleanup(): Promise<void> {
    try {
      if (DatabaseConfig.instance) {
        await DatabaseConfig.instance.$disconnect();
        DatabaseConfig.isConnected = false;

        // Remove references
        if (getEnv.isDevelopment()) {
          globalForPrisma.prisma = undefined;
        }

        // @ts-ignore - Force cleanup
        DatabaseConfig.instance = undefined;

        console.log('🧹 Prisma instance forcefully cleaned up');
      }
    } catch (error: any) {
      console.error('❌ Force cleanup failed:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const prisma = DatabaseConfig.getInstance();
export default DatabaseConfig;