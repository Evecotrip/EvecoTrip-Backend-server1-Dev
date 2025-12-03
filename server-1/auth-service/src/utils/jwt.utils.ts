// ============================================
// src/utils/jwt.utils.ts
// JWT Token Utilities
// ============================================

import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.config';

export interface JWTPayload {
    id: string;           // Our database user UUID
    clerkUid: string;     // Clerk user ID for reference
    phone: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;         // RIDER, DRIVER, FLEET_OWNER, ADMIN, SUPER_ADMIN
}

export interface DecodedToken extends JWTPayload {
    iat: number;
    exp: number;
}

/**
 * Generate JWT access token
 */
export const generateToken = (payload: JWTPayload): string => {
    try {
        const secret = getEnv.jwt.secret();
        const expiry = getEnv.jwt.expiry(); // This returns string like '7d'

        const token = jwt.sign(payload, secret, {
            expiresIn: expiry,
        } as jwt.SignOptions);

        console.log('✅ JWT token generated for user:', payload.id);
        return token;
    } catch (error: any) {
        console.error('❌ Token generation failed:', error.message);
        throw new Error('TOKEN_GENERATION_FAILED');
    }
};

/**
 * Verify JWT token and return decoded payload
 */
export const verifyToken = (token: string): DecodedToken => {
    try {
        const secret = getEnv.jwt.secret();

        const decoded = jwt.verify(token, secret) as DecodedToken;

        return decoded;
    } catch (error: any) {
        console.error('❌ Token verification failed:', error.message);

        if (error.name === 'TokenExpiredError') {
            throw new Error('TOKEN_EXPIRED');
        }

        if (error.name === 'JsonWebTokenError') {
            throw new Error('INVALID_TOKEN');
        }

        throw new Error('TOKEN_VERIFICATION_FAILED');
    }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): DecodedToken | null => {
    try {
        const decoded = jwt.decode(token) as DecodedToken;
        return decoded;
    } catch (error: any) {
        console.error('❌ Token decode failed:', error.message);
        return null;
    }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
    try {
        const decoded = decodeToken(token);
        if (!decoded) return true;

        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    } catch (error) {
        return true;
    }
};

/**
 * Get token expiry time in seconds
 */
export const getTokenExpiry = (token: string): number | null => {
    try {
        const decoded = decodeToken(token);
        if (!decoded) return null;

        return decoded.exp;
    } catch (error) {
        return null;
    }
};

/**
 * Get time until token expires (in seconds)
 */
export const getTokenTimeToExpiry = (token: string): number | null => {
    try {
        const expiry = getTokenExpiry(token);
        if (!expiry) return null;

        const currentTime = Math.floor(Date.now() / 1000);
        const timeToExpiry = expiry - currentTime;

        return timeToExpiry > 0 ? timeToExpiry : 0;
    } catch (error) {
        return null;
    }
};