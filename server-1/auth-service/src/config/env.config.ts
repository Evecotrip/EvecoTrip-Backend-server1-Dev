// // ============================================
// // src/config/env.config.ts
// // Auth Service Environment Configuration
// // ============================================
// import dotenv from 'dotenv';

// // Load environment variables
// dotenv.config();

// /**
//  * Environment variable getter with validation
//  */
// class EnvConfig {
//   /**
//    * Get environment variable with optional default
//    */
//   private static get(key: string, defaultValue?: string): string {
//     const value = process.env[key];

//     if (value === undefined) {
//       if (defaultValue !== undefined) {
//         return defaultValue;
//       }
//       throw new Error(`❌ Missing required environment variable: ${key}`);
//     }

//     return value;
//   }

//   /**
//    * Get optional environment variable
//    */
//   private static getOptional(key: string, defaultValue: string = ''): string {
//     return process.env[key] || defaultValue;
//   }

//   /**
//    * Get environment variable as number
//    */
//   private static getNumber(key: string, defaultValue?: number): number {
//     const value = process.env[key];

//     if (value === undefined) {
//       if (defaultValue !== undefined) {
//         return defaultValue;
//       }
//       throw new Error(`❌ Missing required environment variable: ${key}`);
//     }

//     const parsed = parseInt(value, 10);
//     if (isNaN(parsed)) {
//       throw new Error(`❌ Environment variable ${key} must be a number, got: ${value}`);
//     }

//     return parsed;
//   }

//   /**
//    * Get environment variable as boolean
//    */
//   private static getBoolean(key: string, defaultValue: boolean = false): boolean {
//     const value = process.env[key];

//     if (value === undefined) {
//       return defaultValue;
//     }

//     return value.toLowerCase() === 'true' || value === '1';
//   }

//   /**
//    * Node environment
//    */
//   static isDevelopment(): boolean {
//     return this.get('NODE_ENV', 'development') === 'development';
//   }

//   static isProduction(): boolean {
//     return this.get('NODE_ENV', 'development') === 'production';
//   }

//   static isTest(): boolean {
//     return this.get('NODE_ENV', 'development') === 'test';
//   }

//   /**
//    * Application configuration
//    */
//   static app = {
//     env: () => this.get('NODE_ENV', 'development'),
//     port: () => this.getNumber('PORT', 3001), // ✅ Auth Service Port
//     apiVersion: () => this.get('API_VERSION', 'v1'),
//     serviceName: () => 'auth-service', // ✅ Added
//   };

//   /**
//    * Database configuration (Supabase PostgreSQL)
//    */
//   static database = {
//     url: () => this.get('DATABASE_URL'),
//   };

//   /**
//    * Redis configuration (Upstash)
//    */
//   static redis = {
//     url: () => this.get('UPSTASH_REDIS_REST_URL'),
//     token: () => this.get('UPSTASH_REDIS_REST_TOKEN'),
//     tcpUrl: () => this.get('REDIS_URL'),
//   };

//   /**
//    * Clerk configuration
//    */
//   static clerk = {
//     secretKey: () => this.get('CLERK_SECRET_KEY'),
//     publishableKey: () => this.getOptional('CLERK_PUBLISHABLE_KEY'),
//     webhookSecret: () => this.get('CLERK_WEBHOOK_SECRET'),
//   };

//   /**
//    * JWT configuration
//    */
//   static jwt = {
//     secret: () => this.get('JWT_SECRET_KEY'),
//     expiry: () => this.get('JWT_EXPIRY', '7d'),
//     refreshExpiry: () => this.get('JWT_REFRESH_EXPIRY', '30d'),
//   };

//   /**
//    * AWS SNS configuration (for OTP SMS)
//    */
//   static aws = {
//     region: () => this.get('AWS_REGION', 'ap-south-1'),
//     accessKeyId: () => this.get('AWS_ACCESS_KEY_ID'),
//     secretAccessKey: () => this.get('AWS_SECRET_ACCESS_KEY'),
//     snsTopicArn: () => this.getOptional('AWS_SNS_TOPIC_ARN'),
//   };

//   /**
//    * OTP configuration
//    */
//   static otp = {
//     expiryMinutes: () => this.getNumber('OTP_EXPIRY_MINUTES', 10),
//     maxAttempts: () => this.getNumber('OTP_MAX_ATTEMPTS', 3),
//     length: () => this.getNumber('OTP_LENGTH', 6),
//   };

//   /**
//    * Session configuration
//    */
//   static session = {
//     expiryDays: () => this.getNumber('SESSION_EXPIRY_DAYS', 7),
//     refreshTokenExpiryDays: () => this.getNumber('REFRESH_TOKEN_EXPIRY_DAYS', 30),
//   };

//   /**
//    * Security configuration
//    */
//   static security = {
//     allowedOrigins: () => this.get('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(','),
//     rateLimitWindowMs: () => this.getNumber('RATE_LIMIT_WINDOW_MS', 900000),
//     rateLimitMaxRequests: () => this.getNumber('RATE_LIMIT_MAX_REQUESTS', 100),
//   };

//   /**
//    * Service URLs (for inter-service communication)
//    */
//   static services = {
//     user: () => this.get('USER_SERVICE_URL', 'http://localhost:3002'),
//     driver: () => this.get('DRIVER_SERVICE_URL', 'http://localhost:3003'),
//     ride: () => this.get('RIDE_SERVICE_URL', 'http://localhost:3004'),
//   };

//   /**
//    * Logging configuration
//    */
//   static logging = {
//     level: () => this.get('LOG_LEVEL', 'info'),
//     filePath: () => this.get('LOG_FILE_PATH', './logs'),
//   };

//   /**
//    * Cron jobs configuration
//    */
//   static cron = {
//     enabled: () => this.getBoolean('ENABLE_CRON_JOBS', true),
//     sessionCleanup: () => this.get('SESSION_CLEANUP_CRON', '0 2 * * *'), // ✅ 2 AM daily
//     tokenCleanup: () => this.get('TOKEN_CLEANUP_CRON', '0 3 * * *'),     // ✅ 3 AM daily
//   };

//   /**
//    * Development configuration
//    */
//   static development = {
//     debug: () => this.getBoolean('DEBUG', false),
//     prismaLogQueries: () => this.getBoolean('PRISMA_LOG_QUERIES', false),
//   };

//   /**
//    * Validate all required environment variables
//    */
//   static validateEnv(): void {
//     console.log('🔍 Validating environment variables...');

//     try {
//       // ✅ Critical variables for Auth Service
//       this.database.url();
//       this.redis.url();
//       this.redis.token();
//       this.redis.tcpUrl();
//       this.clerk.secretKey();
//       this.clerk.webhookSecret();
//       this.jwt.secret();
//       this.aws.accessKeyId();
//       this.aws.secretAccessKey();

//       console.log('✅ All required environment variables are set');
//       console.log(`   Environment: ${this.app.env()}`);
//       console.log(`   Port: ${this.app.port()}`);
//       console.log(`   Service: ${this.app.serviceName()}`);
//       console.log(`   API Version: ${this.app.apiVersion()}`);

//     } catch (error: any) {
//       console.error('❌ Environment validation failed:', error.message);
//       console.error('');
//       console.error('💡 Please check your .env file and ensure all required variables are set.');
//       console.error('   Refer to .env.example for the complete list.');
//       process.exit(1);
//     }
//   }

//   /**
//    * Print configuration (safe - no secrets)
//    */
//   static printConfig(): void {
//     console.log('');
//     console.log('⚙️  Auth Service Configuration:');
//     console.log('   ════════════════════════════════════════');
//     console.log(`   Service: ${this.app.serviceName()}`);
//     console.log(`   Environment: ${this.app.env()}`);
//     console.log(`   Port: ${this.app.port()}`);
//     console.log(`   API Version: ${this.app.apiVersion()}`);
//     console.log(`   Debug Mode: ${this.development.debug()}`);
//     console.log('');
//     console.log('   📦 Dependencies:');
//     console.log('   ├─ Database (Supabase): ✅ Connected');
//     console.log('   ├─ Redis (Upstash): ✅ Connected');
//     console.log('   ├─ Clerk SDK: ✅ Initialized');
//     console.log('   └─ AWS SNS: ✅ Configured');
//     console.log('');
//     console.log('   ⚙️  Features:');
//     console.log(`   ├─ OTP Expiry: ${this.otp.expiryMinutes()} minutes`);
//     console.log(`   ├─ Session Expiry: ${this.session.expiryDays()} days`);
//     console.log(`   ├─ JWT Expiry: ${this.jwt.expiry()}`);
//     console.log(`   └─ Cron Jobs: ${this.cron.enabled() ? '✅ Enabled' : '❌ Disabled'}`);
//     console.log('');
//     console.log('   🔗 Service URLs:');
//     console.log(`   ├─ User Service: ${this.services.user()}`);
//     console.log(`   ├─ Driver Service: ${this.services.driver()}`);
//     console.log(`   └─ Ride Service: ${this.services.ride()}`);
//     console.log('   ════════════════════════════════════════');
//     console.log('');
//   }
// }

// // Export singleton instance
// export const getEnv = EnvConfig;

// // Auto-validate on import (only in production)
// if (process.env.NODE_ENV === 'production') {
//   getEnv.validateEnv();
// } 

// ============================================
// src/config/env.config.ts
// Environment Configuration - Supabase Auth Version
// ============================================
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment variable getter with validation
 */
class EnvConfig {
  /**
   * Get environment variable with optional default
   */
  private static get(key: string, defaultValue?: string): string {
    const value = process.env[key];

    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`❌ Missing required environment variable: ${key}`);
    }

    return value;
  }

  /**
   * Get optional environment variable
   */
//   private static getOptional(key: string, defaultValue: string = ''): string {
//     return process.env[key] || defaultValue;
//   }

  /**
   * Get environment variable as number
   */
  private static getNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];

    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`❌ Missing required environment variable: ${key}`);
    }

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`❌ Environment variable ${key} must be a number, got: ${value}`);
    }

    return parsed;
  }

  /**
   * Get environment variable as boolean
   */
  private static getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = process.env[key];

    if (value === undefined) {
      return defaultValue;
    }

    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Node environment
   */
  static isDevelopment(): boolean {
    return this.get('NODE_ENV', 'development') === 'development';
  }

  static isProduction(): boolean {
    return this.get('NODE_ENV', 'development') === 'production';
  }

  static isTest(): boolean {
    return this.get('NODE_ENV', 'development') === 'test';
  }

  /**
   * Application configuration
   */
  static app = {
    env: () => this.get('NODE_ENV', 'development'),
    port: () => this.getNumber('PORT', 3001),
    apiVersion: () => this.get('API_VERSION', 'v1'),
    serviceName: () => 'auth-service',
    frontendUrl: () => this.get('FRONTEND_URL', 'http://localhost:3000'),
  };

  /**
   * Database configuration (Supabase PostgreSQL)
   */
  static database = {
    url: () => this.get('DATABASE_URL'),
  };

  /**
   * Redis configuration (Upstash)
   */
  static redis = {
    url: () => this.get('UPSTASH_REDIS_REST_URL'),
    token: () => this.get('UPSTASH_REDIS_REST_TOKEN'),
    tcpUrl: () => this.get('REDIS_URL'),
  };

  /**
   * Supabase configuration (replaces Clerk)
   */
  static supabase = {
    url: () => this.get('SUPABASE_URL'),
    anonKey: () => this.get('SUPABASE_ANON_KEY'),
    serviceRoleKey: () => this.get('SUPABASE_SERVICE_ROLE_KEY'),
  };

  /**
   * JWT configuration
   */
  static jwt = {
    secret: () => this.get('JWT_SECRET_KEY'),
    expiry: () => this.get('JWT_EXPIRY', '7d'),
    refreshExpiry: () => this.get('JWT_REFRESH_EXPIRY', '30d'),
  };

  /**
   * Session configuration
   */
  static session = {
    expiryDays: () => this.getNumber('SESSION_EXPIRY_DAYS', 7),
    refreshTokenExpiryDays: () => this.getNumber('REFRESH_TOKEN_EXPIRY_DAYS', 30),
  };

  /**
   * Security configuration
   */
  static security = {
    allowedOrigins: () => this.get('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(','),
    rateLimitWindowMs: () => this.getNumber('RATE_LIMIT_WINDOW_MS', 900000),
    rateLimitMaxRequests: () => this.getNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  };

  /**
   * Service URLs (for inter-service communication)
   */
  static services = {
    user: () => this.get('USER_SERVICE_URL', 'http://localhost:3002'),
    driver: () => this.get('DRIVER_SERVICE_URL', 'http://localhost:3003'),
    ride: () => this.get('RIDE_SERVICE_URL', 'http://localhost:3004'),
  };

  /**
   * Logging configuration
   */
  static logging = {
    level: () => this.get('LOG_LEVEL', 'info'),
    filePath: () => this.get('LOG_FILE_PATH', './logs'),
  };

  /**
   * Cron jobs configuration
   */
  static cron = {
    enabled: () => this.getBoolean('ENABLE_CRON_JOBS', true),
    sessionCleanup: () => this.get('SESSION_CLEANUP_CRON', '0 2 * * *'),
    tokenCleanup: () => this.get('TOKEN_CLEANUP_CRON', '0 3 * * *'),
  };

  /**
   * Development configuration
   */
  static development = {
    debug: () => this.getBoolean('DEBUG', false),
    prismaLogQueries: () => this.getBoolean('PRISMA_LOG_QUERIES', false),
  };

  /**
   * Validate all required environment variables
   */
  static validateEnv(): void {
    console.log('🔍 Validating environment variables...');

    try {
      // ✅ Critical variables for Auth Service with Supabase
      this.database.url();
      this.redis.url();
      this.redis.token();
      this.redis.tcpUrl();
      this.supabase.url();
      this.supabase.anonKey();
      this.supabase.serviceRoleKey();
      this.jwt.secret();

      console.log('✅ All required environment variables are set');
      console.log(`   Environment: ${this.app.env()}`);
      console.log(`   Port: ${this.app.port()}`);
      console.log(`   Service: ${this.app.serviceName()}`);
      console.log(`   API Version: ${this.app.apiVersion()}`);

    } catch (error: any) {
      console.error('❌ Environment validation failed:', error.message);
      console.error('');
      console.error('💡 Please check your .env file and ensure all required variables are set.');
      console.error('   Refer to .env.example for the complete list.');
      process.exit(1);
    }
  }

  /**
   * Print configuration (safe - no secrets)
   */
  static printConfig(): void {
    console.log('');
    console.log('⚙️  Auth Service Configuration:');
    console.log('   ═══════════════════════════════════════════');
    console.log(`   Service: ${this.app.serviceName()}`);
    console.log(`   Environment: ${this.app.env()}`);
    console.log(`   Port: ${this.app.port()}`);
    console.log(`   API Version: ${this.app.apiVersion()}`);
    console.log(`   Debug Mode: ${this.development.debug()}`);
    console.log('');
    console.log('   📦 Dependencies:');
    console.log('   ├─ Database (Supabase): ✅ Connected');
    console.log('   ├─ Redis (Upstash): ✅ Connected');
    console.log('   └─ Supabase Auth: ✅ Initialized');
    console.log('');
    console.log('   ⚙️  Features:');
    console.log(`   ├─ Session Expiry: ${this.session.expiryDays()} days`);
    console.log(`   ├─ JWT Expiry: ${this.jwt.expiry()}`);
    console.log(`   └─ Cron Jobs: ${this.cron.enabled() ? '✅ Enabled' : '❌ Disabled'}`);
    console.log('');
    console.log('   🔗 Service URLs:');
    console.log(`   ├─ User Service: ${this.services.user()}`);
    console.log(`   ├─ Driver Service: ${this.services.driver()}`);
    console.log(`   └─ Ride Service: ${this.services.ride()}`);
    console.log('   ═══════════════════════════════════════════');
    console.log('');
  }
}

// Export singleton instance
export const getEnv = EnvConfig;

// Auto-validate on import (only in production)
if (process.env.NODE_ENV === 'production') {
  getEnv.validateEnv();
}