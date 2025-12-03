// src/middleware/rateLimitingRedis.ts
import { Request, Response, NextFunction } from 'express';
import { RedisConnection } from '../config/redis.config';

// Helper function to get client IP
const getClientIP = (req: Request): string => {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    '0.0.0.0'
  );
};

// Custom key generator for rate limiting
const generateRateLimitKey = (req: Request, prefix: string): string => {
  const ip = getClientIP(req);
  const userId = (req as any).user?.userId || 'anonymous';
  return `ratelimit:${prefix}:${ip}:${userId}`;
};

interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  max: number;           // Max requests per window
  message: string;       // Error message
  prefix: string;        // Redis key prefix
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  skip?: (req: Request) => boolean;
}

// Core rate limiting function using Redis
const createRedisRateLimit = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if should skip
      if (options.skip && options.skip(req)) {
        return next();
      }

      const redis = RedisConnection.getInstance().getClient();
      const key = generateRateLimitKey(req, options.prefix);
      const windowSeconds = Math.floor(options.windowMs / 1000);

      // Get current count
      const current = await redis.get(key);
      const currentCount = current ? parseInt(current as string, 10) : 0;

      // Check if limit exceeded
      if (currentCount >= options.max) {
        const ttl = await redis.ttl(key);
        
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: options.message,
          retryAfter: ttl > 0 ? ttl : windowSeconds,
          type: 'RATE_LIMIT_EXCEEDED',
          limit: options.max,
          remaining: 0,
          reset: Date.now() + (ttl > 0 ? ttl * 1000 : options.windowMs)
        });
        
        // Log rate limit violation
        console.warn('🚨 Rate Limit Exceeded:', {
          ip: getClientIP(req),
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
          userId: (req as any).user?.userId || 'anonymous',
          limit: options.max,
          current: currentCount
        });
        
        return;
      }

      // Increment counter
      if (currentCount === 0) {
        // First request - set counter with expiration
        await redis.set(key, '1', { ex: windowSeconds });
      } else {
        // Increment existing counter
        await redis.incr(key);
      }

      // Get updated count and TTL
      const updatedCount = currentCount + 1;
      const ttl = await redis.ttl(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', options.max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - updatedCount).toString());
      res.setHeader('X-RateLimit-Reset', (Date.now() + ttl * 1000).toString());

      // Store original send to handle skipSuccessfulRequests/skipFailedRequests
      const originalSend = res.send;
      res.send = function(data: any) {
        const shouldDecrement = 
          (options.skipSuccessfulRequests && res.statusCode >= 200 && res.statusCode < 300) ||
          (options.skipFailedRequests && res.statusCode >= 400);

        if (shouldDecrement) {
          // Decrement counter asynchronously (fire and forget)
          redis.decr(key).catch(err => 
            console.error('Failed to decrement rate limit:', err)
          );
        }

        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('❌ Rate limiting error:', error);
      // On Redis error, allow request through (fail open)
      next();
    }
  };
};

// ===========================================
// RATE LIMITERS
// ===========================================

// General API rate limiter
export const generalRateLimit = createRedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP. Please try again after 15 minutes.',
  prefix: 'general',
  skip: (req: Request) => {
    return req.path === '/health' || req.path === '/' || req.path === '/health/redis';
  }
});

// Strict authentication rate limiter
export const authRateLimit = createRedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  prefix: 'auth',
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false
});

// Password reset rate limiter
export const passwordResetRateLimit = createRedisRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts. Please try again after 1 hour.',
  prefix: 'password-reset'
});

// Admin operations rate limiter
export const adminRateLimit = createRedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many admin requests. Please try again after 15 minutes.',
  prefix: 'admin',
  skip: (req: Request) => {
    const userRole = (req as any).user?.role;
    return userRole === 'SUPER_ADMIN';
  }
});

// File upload rate limiter
export const uploadRateLimit = createRedisRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many file uploads. Please try again after 1 hour.',
  prefix: 'upload'
});

// Assessment rate limiter
export const assessmentRateLimit = createRedisRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many assessment attempts. Please try again after 1 hour.',
  prefix: 'assessment'
});

// Course management rate limiter
export const courseManagementRateLimit = createRedisRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many course management operations. Please try again after 1 hour.',
  prefix: 'course-management'
});

// Reports generation rate limiter
export const reportsRateLimit = createRedisRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many report generation requests. Please try again after 1 hour.',
  prefix: 'reports'
});

// Custom rate limiter factory
export const createCustomRateLimit = (options: {
  windowMs: number;
  max: number;
  message: string;
  prefix: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return createRedisRateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    prefix: options.prefix,
    skipSuccessfulRequests: options.skipSuccessfulRequests
  });
};

// Rate limit logger middleware
export const rateLimitLogger = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    if (res.statusCode === 429) {
      console.warn('🚨 Rate Limit Exceeded:', {
        ip: getClientIP(req),
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        userId: (req as any).user?.userId || 'anonymous'
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Utility: Clear rate limit for a specific IP/user (admin use)
export const clearRateLimit = async (ip: string, userId: string, prefix: string): Promise<boolean> => {
  try {
    const redis = RedisConnection.getInstance().getClient();
    const key = `ratelimit:${prefix}:${ip}:${userId}`;
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Failed to clear rate limit:', error);
    return false;
  }
};

// Utility: Get current rate limit status
export const getRateLimitStatus = async (ip: string, userId: string, prefix: string) => {
  try {
    const redis = RedisConnection.getInstance().getClient();
    const key = `ratelimit:${prefix}:${ip}:${userId}`;
    
    const count = await redis.get(key);
    const ttl = await redis.ttl(key);
    
    return {
      current: count ? parseInt(count as string, 10) : 0,
      ttl: ttl > 0 ? ttl : 0,
      key
    };
  } catch (error) {
    console.error('Failed to get rate limit status:', error);
    return null;
  }
};