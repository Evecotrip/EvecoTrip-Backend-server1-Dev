// ============================================
// src/server.ts
// EvecoTrip Auth Service - Entry Point
// ============================================

import express from 'express';
import dotenv from 'dotenv';
import DatabaseConfig from './config/database.config';
import { RedisConnection } from './config/redis.config';
import ClerkConfig from './config/clerk.config';
import { getEnv } from './config/env.config';

// Import routes
import authRoutes from './routes/auth.routes';
import webhookRoutes from './routes/webhook.routes';

// Import security middleware
import { 
  enforceHTTPS, 
  helmetConfig, 
  corsConfig, 
  apiSecurityHeaders,
  corsErrorHandler,
  securityLogger 
} from './middleware/security.middleware';

// Import rate limiting middleware
import {
  generalRateLimit,
  rateLimitLogger
} from './middleware/ratelimitRedis.middleware';

// Load environment variables
dotenv.config();

// Validate environment variables
getEnv.validateEnv();

// Initialize Express app
const app = express();
const PORT = getEnv.app.port();
const API_VERSION = getEnv.app.apiVersion();

// ============================================
// WEBHOOK ROUTES (BEFORE express.json())
// ============================================
// IMPORTANT: Webhook routes need raw body for signature verification
app.use(`/api/${API_VERSION}/webhooks`, webhookRoutes);

// ============================================
// SECURITY MIDDLEWARE (Apply in this order)
// ============================================

// 1. HTTPS Enforcement (only in production)
if (getEnv.isProduction()) {
  app.use(enforceHTTPS);
}

// 2. Security Headers (Helmet)
app.use(helmetConfig);

// 3. CORS Protection
app.use(corsConfig);

// 4. Security Logging
app.use(securityLogger);

// 5. Rate Limit Logging
app.use(rateLimitLogger);


// 7. API Security Headers
app.use(apiSecurityHeaders);

// 8. Body Parsing (after webhook routes)
app.use(express.json({ 
  limit: '10mb',
  strict: true 
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EvecoTrip Auth Service is running',
    service: 'auth-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: getEnv.app.env(),
    security: {
      https: getEnv.isProduction() ? 'enforced' : 'optional',
      cors: 'enabled',
      helmet: 'enabled',
      rateLimit: 'enabled'
    },
    endpoints: {
      auth: `/api/${API_VERSION}/auth/*`,
      webhooks: `/api/${API_VERSION}/webhooks/*`,
      health: '/health',
    }
  });
});

app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbHealthy = await DatabaseConfig.healthCheck();
    
    // Test Redis connection
    const redisConnection = RedisConnection.getInstance();
    const redisHealthy = await redisConnection.healthCheck();
    
    const isHealthy = dbHealthy && redisHealthy;
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      success: isHealthy,
      message: isHealthy ? 'Auth Service is healthy' : 'Auth Service is unhealthy',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: getEnv.app.env(),
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
        clerk: ClerkConfig.isReady() ? 'ready' : 'not ready',
      },
      security: {
        https: req.secure || req.headers['x-forwarded-proto'] === 'https',
        cors: 'enabled',
        helmet: 'enabled',
        rateLimit: 'enabled',
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      service: 'auth-service',
      error: getEnv.isDevelopment() ? error.message : 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// API ROUTES
// ============================================

// Apply general rate limiting to all API routes
app.use(`/api/${API_VERSION}`, generalRateLimit);

// Auth routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// CORS error handler
app.use(corsErrorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'ROUTE_NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /',
      'GET /health',
      `POST /api/${API_VERSION}/auth/register`,
      `POST /api/${API_VERSION}/auth/login`,
      `POST /api/${API_VERSION}/auth/clerk/exchange`,
      `POST /api/${API_VERSION}/webhooks/clerk`,
    ]
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err);
  
  const statusCode = err.status || err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: getEnv.isDevelopment() ? err.message : 'Something went wrong',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    ...(getEnv.isDevelopment() && { stack: err.stack })
  });
});

// ============================================
// SERVICE INITIALIZATION
// ============================================

async function initializeServices(): Promise<void> {
  try {
    console.log('');
    console.log('🚀 Initializing EvecoTrip Auth Service...');
    console.log('');
    
    // 1. Database Connection
    console.log('📊 Connecting to database...');
    await DatabaseConfig.connect();
    console.log('✅ Database connected (Supabase PostgreSQL)');
    console.log('');
    
    // 2. Redis Connection
    console.log('💾 Connecting to Redis...');
    try {
      const redisConnection = RedisConnection.getInstance();
      await redisConnection.connect();
      console.log('✅ Redis connected (Upstash)');
    } catch (redisError: any) {
      console.warn('⚠️  Redis connection failed - caching will be disabled');
      console.warn('   Error:', redisError.message);
    }
    console.log('');
    
    // 3. Clerk Initialization
    console.log('🔐 Initializing Clerk...');
    try {
      ClerkConfig.getInstance();
      console.log('✅ Clerk initialized successfully');
    } catch (clerkError: any) {
      console.error('❌ Clerk initialization failed:', clerkError.message);
      throw clerkError;
    }
    console.log('');
    
    // Print configuration summary
    getEnv.printConfig();
    
  } catch (error: any) {
    console.error('');
    console.error('❌ Service initialization failed:', error.message);
    console.error('');
    throw error;
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function gracefulShutdown(signal: string): Promise<void> {
  console.log('');
  console.log(`🛑 Received ${signal}, shutting down gracefully...`);
  console.log('');
  
  try {
    // Close database connection
    console.log('📊 Closing database connection...');
    await DatabaseConfig.disconnect();
    console.log('✅ Database disconnected');
    
    // Close Redis connection
    console.log('💾 Closing Redis connection...');
    const redisConnection = RedisConnection.getInstance();
    await redisConnection.disconnect();
    console.log('✅ Redis disconnected');
    
    console.log('');
    console.log('✅ Graceful shutdown completed');
    console.log('');
    
    process.exit(0);
  } catch (error: any) {
    console.error('');
    console.error('❌ Shutdown error:', error.message);
    console.error('');
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('');
  console.error('❌ Uncaught Exception:', error);
  console.error('');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  console.error('');
  console.error('❌ Unhandled Rejection:', reason);
  console.error('');
  gracefulShutdown('UNHANDLED_REJECTION');
});

// ============================================
// START SERVER
// ============================================

async function startServer(): Promise<void> {
  try {
    // Initialize all services
    await initializeServices();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🚀 EvecoTrip Auth Service Started Successfully!');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      console.log(`   🌐 Server:        http://localhost:${PORT}`);
      console.log(`   📊 Health Check:  http://localhost:${PORT}/health`);
      console.log(`   🔐 API Endpoint:  http://localhost:${PORT}/api/${API_VERSION}/auth`);
      console.log(`   📡 Webhooks:      http://localhost:${PORT}/api/${API_VERSION}/webhooks`);
      console.log('');
      console.log(`   🛡️  Security:      Full protection enabled`);
      console.log(`   ⚡ Rate Limits:   Active on all endpoints`);
      console.log(`   🌍 Environment:   ${getEnv.app.env()}`);
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
    });
    
  } catch (error: any) {
    console.error('');
    console.error('❌ Failed to start server:', error.message);
    console.error('');
    process.exit(1);
  }
}

// Start the server
startServer();