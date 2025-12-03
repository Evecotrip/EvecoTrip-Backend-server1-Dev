// ============================================
// src/middleware/auth.middleware.ts - CORRECTED
// ============================================
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { RoleType } from '@prisma/client'; 
import { CacheService } from '../cache/cache.service';
import { CacheKeys } from '../cache/cache.keys';
import { CacheTTL } from '../cache/cache.ttl';
import crypto from 'crypto';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    clerkUid: string;
    email: string;
    firstName: string;
    lastName: string;
    role: RoleType;  // ✅ Use RoleType enum
  };
}

/**
 * Generate hash of token for cache key
 */
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
};

/**
 * Authenticate JWT Token with Redis caching
 */
export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header. Format: Bearer <token>',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Token not provided',
      });
    }

    // Generate token hash for cache key
    const tokenHash = hashToken(token);
    const cacheKey = CacheKeys.token.decoded(tokenHash);
    
    // Try to get from cache first
    const cache = CacheService.getInstance();
    const cachedUser = await cache.get<any>(cacheKey);

    if (cachedUser) {
      console.log('✅ Auth cache HIT:', cachedUser.email);
      req.user = cachedUser;
      return next();
    }

    console.log('⚠️ Auth cache MISS, verifying token...');

    // Cache miss - verify token
    const decoded = verifyToken(token);

    // Check if token is blacklisted
    const blacklistKey = CacheKeys.token.blacklist(tokenHash);
    const isBlacklisted = await cache.exists(blacklistKey);

    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_REVOKED',
        message: 'This token has been revoked. Please login again.',
      });
    }

    // Prepare user data
    const userData = {
      id: decoded.id,
      clerkUid: decoded.clerkUid,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: decoded.role as RoleType,  // ✅ Cast to RoleType
    };

    // Cache the decoded token
    await cache.set(cacheKey, userData, CacheTTL.TOKEN_DECODED);

    req.user = userData;
    next();
  } catch (error: any) {
    console.error('❌ JWT authentication failed:', error.message);

    if (error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please login again.',
      });
    }

    return res.status(403).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid or malformed token',
    });
  }
};

/**
 * Optional Authentication
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,

  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = undefined;
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      req.user = undefined;
      return next();
    }

    // Try cache first
    const tokenHash = hashToken(token);
    const cacheKey = CacheKeys.token.decoded(tokenHash);
    
    const cache = CacheService.getInstance();
    const cachedUser = await cache.get<any>(cacheKey);

    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }

    // Verify token
    const decoded = verifyToken(token);

    const userData = {
      id: decoded.id,
      clerkUid: decoded.clerkUid,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: decoded.role as RoleType,  // ✅ Cast to RoleType
    };

    // Cache it
    await cache.set(cacheKey, userData, CacheTTL.TOKEN_DECODED);

    req.user = userData;
    next();
  } catch (error) {
    req.user = undefined;
    next();
  }
};

/**
 * Invalidate user's cached tokens (for logout)
 */
export const invalidateUserTokens = async (userId: string): Promise<void> => {
  try {
    const cache = CacheService.getInstance();
    
    await cache.deletePattern(CacheKeys.user.pattern());
    await cache.deletePattern(CacheKeys.session.pattern());
    
    console.log(`✅ Invalidated cache for user: ${userId}`);
  } catch (error) {
    console.error('❌ Error invalidating user tokens:', error);
  }
};

/**
 * Blacklist a specific token (for logout)
 */
export const blacklistToken = async (
  token: string, 
  expiresIn: number = CacheTTL.TOKEN_BLACKLIST
): Promise<void> => {
  try {
    const cache = CacheService.getInstance();
    const tokenHash = hashToken(token);
    
    const blacklistKey = CacheKeys.token.blacklist(tokenHash);
    await cache.set(blacklistKey, true, expiresIn);
    
    const decodedKey = CacheKeys.token.decoded(tokenHash);
    await cache.delete(decodedKey);
    
    console.log('✅ Token blacklisted successfully');
  } catch (error) {
    console.error('❌ Error blacklisting token:', error);
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (...allowedRoles: RoleType[]) => {  // ✅ RoleType[]
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
        requiredRoles: allowedRoles,
        yourRole: req.user.role,
      });
    }

  return  next();
  };
};

// ✅ Role shortcuts using RoleType enum
export const requireRider = requireRole(RoleType.RIDER);
export const requireDriver = requireRole(RoleType.DRIVER);
export const requireFleetOwner = requireRole(RoleType.FLEET_OWNER);
export const requireAdmin = requireRole(RoleType.ADMIN);
export const requireSuperAdmin = requireRole(RoleType.SUPER_ADMIN);