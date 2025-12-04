// ============================================
// src/controllers/auth.controller.ts - PRODUCTION VERSION
// Complete Authentication Controller with Enhanced Error Handling
// ============================================

import { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database.config';
import { CacheService } from '../cache/cache.service';

const authService = new AuthService(prisma);
const cache = CacheService.getInstance();

export class AuthController {
    // ============================================
    // 1. SEND OTP
    // POST /api/v1/auth/phone/send-otp
    // ============================================
    static async sendOTP(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { phone } = req.body;

            await authService.sendOTP({ phone });

            return res.status(200).json({
                success: true,
                message: 'OTP sent successfully. Please check your phone.',
                data: {
                    phone,
                    expiresIn: 600, // 10 minutes
                },
            });
        } catch (error: any) {
            console.error('❌ Send OTP error:', error);

            if (error.message === 'OTP_RATE_LIMIT_EXCEEDED') {
                return res.status(429).json({
                    success: false,
                    error: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many OTP requests. Please try again after 15 minutes.',
                });
            }

            return res.status(500).json({
                success: false,
                error: 'SEND_OTP_FAILED',
                message: 'Failed to send OTP. Please try again.',
            });
        }
    }

    // ============================================
    // 2. VERIFY OTP & LOGIN/REGISTER
    // POST /api/v1/auth/phone/verify
    // ============================================
    static async verifyOTP(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { phone, otp } = req.body;

            const result = await authService.verifyOTPAndLogin({ phone, otp });

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: result.user.id,
                        phone: result.user.phone,
                        email: result.user.email,
                        firstName: result.user.firstName,
                        lastName: result.user.lastName,
                        profilePhotoUrl: result.user.profilePhotoUrl,
                        isVerified: result.user.isVerified,
                        createdAt: result.user.createdAt,
                    },
                    token: result.token,
                    refreshToken: result.refreshToken,
                    expiresIn: '7d',
                },
            });
        } catch (error: any) {
            console.error('❌ Verify OTP error:', error);

            if (error.message === 'OTP_VERIFICATION_FAILED') {
                return res.status(400).json({
                    success: false,
                    error: 'INVALID_OTP',
                    message: 'Invalid or expired OTP. Please try again.',
                });
            }

            if (error.message === 'USER_INACTIVE') {
                return res.status(403).json({
                    success: false,
                    error: 'USER_INACTIVE',
                    message: 'Your account is inactive. Please contact support.',
                });
            }

            if (error.message === 'USER_SUSPENDED') {
                return res.status(403).json({
                    success: false,
                    error: 'USER_SUSPENDED',
                    message: 'Your account has been suspended. Please contact support.',
                });
            }

            if (error.message === 'RIDER_ROLE_NOT_FOUND') {
                return res.status(500).json({
                    success: false,
                    error: 'CONFIGURATION_ERROR',
                    message: 'System configuration error. Please contact support.',
                });
            }

            return res.status(500).json({
                success: false,
                error: 'VERIFICATION_FAILED',
                message: 'Failed to verify OTP. Please try again.',
            });
        }
    }

    // ============================================
    // 3. GET GOOGLE OAUTH URL
    // GET /api/v1/auth/oauth/google
    // ============================================
    static async getGoogleAuthURL(_req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const result = await authService.getGoogleAuthURL();

            return res.status(200).json({
                success: true,
                message: 'OAuth URL generated successfully',
                data: {
                    url: result.url,
                    provider: 'google',
                },
            });
        } catch (error: any) {
            console.error('❌ Get Google OAuth URL error:', error);

            return res.status(500).json({
                success: false,
                error: 'OAUTH_URL_FAILED',
                message: 'Failed to generate OAuth URL. Please try again.',
            });
        }
    }

    // ============================================
    // 4. OAUTH CALLBACK (Exchange Supabase Token)
    // POST /api/v1/auth/oauth/callback
    // ============================================
    static async oauthCallback(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { accessToken } = req.body;

            const result = await authService.supabaseExchange({ accessToken });

            return res.status(200).json({
                success: true,
                message: 'OAuth login successful',
                data: {
                    user: {
                        id: result.user.id,
                        phone: result.user.phone,
                        email: result.user.email,
                        firstName: result.user.firstName,
                        lastName: result.user.lastName,
                        profilePhotoUrl: result.user.profilePhotoUrl,
                        isVerified: result.user.isVerified,
                        createdAt: result.user.createdAt,
                    },
                    token: result.token,
                    refreshToken: result.refreshToken,
                    expiresIn: '7d',
                },
            });
        } catch (error: any) {
            console.error('❌ OAuth callback error:', error);

            if (error.message === 'INVALID_SUPABASE_TOKEN') {
                return res.status(400).json({
                    success: false,
                    error: 'INVALID_TOKEN',
                    message: 'Invalid Supabase access token.',
                });
            }

            if (error.message === 'USER_NOT_REGISTERED') {
                return res.status(404).json({
                    success: false,
                    error: 'USER_NOT_FOUND',
                    message: 'User not found. Please register first using phone OTP.',
                });
            }

            if (error.message === 'USER_INACTIVE') {
                return res.status(403).json({
                    success: false,
                    error: 'USER_INACTIVE',
                    message: 'Your account is inactive. Please contact support.',
                });
            }

            if (error.message === 'USER_SUSPENDED') {
                return res.status(403).json({
                    success: false,
                    error: 'USER_SUSPENDED',
                    message: 'Your account has been suspended. Please contact support.',
                });
            }

            return res.status(500).json({
                success: false,
                error: 'OAUTH_CALLBACK_FAILED',
                message: 'Failed to complete OAuth login. Please try again.',
            });
        }
    }

    // ============================================
    // 5. REFRESH TOKEN
    // POST /api/v1/auth/refresh
    // ============================================
    static async refreshToken(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { refreshToken } = req.body;

            const result = await authService.refreshAccessToken(refreshToken);

            return res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    token: result.token,
                    refreshToken: result.refreshToken,
                    expiresIn: '7d',
                },
            });
        } catch (error: any) {
            console.error('❌ Refresh token error:', error);

            if (error.message === 'INVALID_REFRESH_TOKEN') {
                return res.status(400).json({
                    success: false,
                    error: 'INVALID_REFRESH_TOKEN',
                    message: 'Invalid refresh token.',
                });
            }

            if (error.message === 'REFRESH_TOKEN_REVOKED') {
                return res.status(401).json({
                    success: false,
                    error: 'TOKEN_REVOKED',
                    message: 'Refresh token has been revoked. Please login again.',
                });
            }

            if (error.message === 'REFRESH_TOKEN_EXPIRED') {
                return res.status(401).json({
                    success: false,
                    error: 'TOKEN_EXPIRED',
                    message: 'Refresh token has expired. Please login again.',
                });
            }

            if (error.message === 'USER_INACTIVE' || error.message === 'USER_SUSPENDED') {
                return res.status(403).json({
                    success: false,
                    error: error.message,
                    message: 'Your account is not active. Please contact support.',
                });
            }

            return res.status(500).json({
                success: false,
                error: 'REFRESH_FAILED',
                message: 'Failed to refresh token. Please try again.',
            });
        }
    }

    // ============================================
    // 6. LOGOUT
    // POST /api/v1/auth/logout
    // ============================================
    static async logout(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const userId = req.user?.id;
            const token = req.headers.authorization?.split(' ')[1];

            if (!userId || !token) {
                return res.status(400).json({
                    success: false,
                    error: 'BAD_REQUEST',
                    message: 'User ID or token not found.',
                });
            }

            await authService.logout(userId, token);

            return res.status(200).json({
                success: true,
                message: 'Logged out successfully',
            });
        } catch (error: any) {
            console.error('❌ Logout error:', error);

            return res.status(500).json({
                success: false,
                error: 'LOGOUT_FAILED',
                message: 'Failed to logout. Please try again.',
            });
        }
    }

    // ============================================
    // 7. GET CURRENT USER
    // GET /api/v1/auth/me
    // ============================================
    static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'UNAUTHORIZED',
                    message: 'User not authenticated.',
                });
            }

            const user = await authService.getCurrentUser(userId);

            return res.status(200).json({
                success: true,
                message: 'User retrieved successfully',
                data: {
                    user: {
                        id: user.id,
                        phone: user.phone,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        profilePhotoUrl: user.profilePhotoUrl,
                        dateOfBirth: user.dateOfBirth,
                        gender: user.gender,
                        isVerified: user.isVerified,
                        isActive: user.isActive,
                        isSuspended: user.isSuspended,
                        createdAt: user.createdAt,
                        lastLoginAt: user.lastLoginAt,
                    },
                },
            });
        } catch (error: any) {
            console.error('❌ Get current user error:', error);

            if (error.message === 'USER_NOT_FOUND') {
                return res.status(404).json({
                    success: false,
                    error: 'USER_NOT_FOUND',
                    message: 'User not found.',
                });
            }

            return res.status(500).json({
                success: false,
                error: 'FETCH_USER_FAILED',
                message: 'Failed to fetch user. Please try again.',
            });
        }
    }

    // ============================================
    // 8. RESEND OTP
    // POST /api/v1/auth/phone/resend-otp
    // ============================================
    static async resendOTP(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { phone } = req.body;

            // Check if last OTP was sent recently (prevent spam)
            const lastSentKey = `otp:last_sent:${phone}`;
            const lastSent = await cache.get<number>(lastSentKey);

            if (lastSent) {
                const timeSinceLastSent = Date.now() - lastSent;
                if (timeSinceLastSent < 60000) { // 1 minute
                    return res.status(429).json({
                        success: false,
                        error: 'OTP_RESEND_TOO_SOON',
                        message: 'Please wait 1 minute before requesting a new OTP.',
                        retryAfter: Math.ceil((60000 - timeSinceLastSent) / 1000),
                    });
                }
            }

            await authService.sendOTP({ phone });

            return res.status(200).json({
                success: true,
                message: 'OTP resent successfully. Please check your phone.',
                data: {
                    phone,
                    expiresIn: 600, // 10 minutes
                },
            });
        } catch (error: any) {
            console.error('❌ Resend OTP error:', error);

            if (error.message === 'OTP_RATE_LIMIT_EXCEEDED') {
                return res.status(429).json({
                    success: false,
                    error: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many OTP requests. Please try again after 15 minutes.',
                });
            }

            return res.status(500).json({
                success: false,
                error: 'RESEND_OTP_FAILED',
                message: 'Failed to resend OTP. Please try again.',
            });
        }
    }

    // ============================================
    // 9. GENERATE JWT TOKEN (ADMIN/TESTING USE)
    // POST /api/v1/auth/generate-token
    // ============================================
    static async generateToken(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { userId, supabaseAuthId } = req.body;

            // Find user by userId or supabaseAuthId
            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { id: userId || undefined },
                        { supabaseAuthId: supabaseAuthId || undefined },
                    ],
                },
                include: {
                    userRoles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'USER_NOT_FOUND',
                    message: 'User not found with provided userId or supabaseAuthId.',
                });
            }

            // Check if user is active
            if (!user.isActive) {
                return res.status(403).json({
                    success: false,
                    error: 'USER_INACTIVE',
                    message: 'User account is inactive.',
                });
            }

            if (user.isSuspended) {
                return res.status(403).json({
                    success: false,
                    error: 'USER_SUSPENDED',
                    message: 'User account is suspended.',
                });
            }

            // Get primary role
            const primaryRole = user.userRoles[0]?.role?.name || 'RIDER';

            // Generate JWT token
            const { generateToken } = await import('../utils/jwt.utils');
            const token = generateToken({
                id: user.id,
                supabaseAuthId: user.supabaseAuthId || '',
                phone: user.phone,
                email: user.email || '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                role: primaryRole,
            });

            return res.status(200).json({
                success: true,
                message: 'JWT token generated successfully',
                data: {
                    user: {
                        id: user.id,
                        phone: user.phone,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: primaryRole,
                    },
                    token,
                    tokenType: 'Bearer',
                    expiresIn: '7d',
                },
            });
        } catch (error: any) {
            console.error('❌ Generate token error:', error);

            return res.status(500).json({
                success: false,
                error: 'TOKEN_GENERATION_FAILED',
                message: 'Failed to generate token. Please try again.',
            });
        }
    }
}