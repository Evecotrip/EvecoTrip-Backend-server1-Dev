// ============================================
// src/services/auth.service.ts - PRODUCTION VERSION
// Complete Authentication Service with Transactions & Error Handling
// ============================================

import { PrismaClient, User, Session, RefreshToken, Prisma } from '@prisma/client';
import crypto from 'crypto';
import { generateToken } from '../utils/jwt.utils';
import SupabaseConfig from '../config/supabase.config';
import { CacheService } from '../cache/cache.service';
import { CacheKeys } from '../cache/cache.keys';
import { CacheTTL } from '../cache/cache.ttl';
import { getEnv } from '../config/env.config';

// ============================================
// INTERFACES
// ============================================

interface AuthResponse {
    user: User;
    token: string;
    refreshToken: string;
}

interface OTPSendInput {
    phone: string;
}

interface OTPVerifyInput {
    phone: string;
    otp: string;
}

interface GoogleAuthURLResponse {
    url: string;
}

interface SupabaseExchangeInput {
    accessToken: string;
}

// User with roles included
type UserWithRoles = Prisma.UserGetPayload<{
    include: {
        userRoles: {
            include: {
                role: true;
            };
        };
    };
}>;

// ============================================
// AUTH SERVICE CLASS
// ============================================

export class AuthService {
    private prisma: PrismaClient;
    private cache: CacheService;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
        this.cache = CacheService.getInstance();
    }

    // ============================================
    // 1. SEND OTP (Phone Authentication)
    // ============================================
    async sendOTP(data: OTPSendInput): Promise<void> {
        try {
            const { phone } = data;

            // Check rate limiting (max 3 OTPs per 15 minutes)
            const attemptsKey = CacheKeys.otp.attempts(phone);
            const attempts = await this.cache.get<number>(attemptsKey) || 0;

            if (attempts >= 3) {
                throw new Error('OTP_RATE_LIMIT_EXCEEDED');
            }

            // Send OTP via Supabase
            await SupabaseConfig.signUpWithPhone(phone);

            // Increment attempts counter (15 minutes TTL)
            await this.cache.set(attemptsKey, attempts + 1, 900);
            
            // Track last sent time (1 minute TTL for resend protection)
            await this.cache.set(CacheKeys.otp.lastSent(phone), Date.now(), 60);

            console.log('✅ OTP sent successfully to:', phone);
        } catch (error: any) {
            console.error('❌ Send OTP failed:', error.message);
            
            // Re-throw with original error for proper handling
            if (error.message === 'OTP_RATE_LIMIT_EXCEEDED') {
                throw error;
            }
            
            // Wrap other errors
            throw new Error('SEND_OTP_FAILED');
        }
    }

    // ============================================
    // 2. VERIFY OTP & LOGIN/REGISTER
    // ============================================
    async verifyOTPAndLogin(data: OTPVerifyInput): Promise<AuthResponse> {
        try {
            const { phone, otp } = data;

            // Verify OTP with Supabase
            const { user: supabaseUser } = await SupabaseConfig.verifyPhoneOTP(phone, otp);

            if (!supabaseUser) {
                throw new Error('OTP_VERIFICATION_FAILED');
            }

            // Find existing user
            let user = await this.prisma.user.findUnique({
                where: { phone },
                include: {
                    userRoles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });

            if (!user) {
                // ✅ NEW USER - Create with role in atomic transaction
                user = await this.createNewUserWithRole(phone, supabaseUser);
                console.log('📝 Created new user:', user.id);
            } else {
                // ✅ EXISTING USER - Update and sync
                user = await this.syncExistingUser(user, supabaseUser);
                console.log('🔄 Updated existing user:', user.id);
            }

            // ✅ Validate user status
            this.validateUserStatus(user);

            // ✅ Generate tokens and session
            return await this.generateAuthResponse(user, supabaseUser.id);

        } catch (error: any) {
            console.error('❌ OTP verification failed:', error.message);
            throw error;
        }
    }

    // ============================================
    // 3. GET GOOGLE OAUTH URL
    // ============================================
    async getGoogleAuthURL(): Promise<GoogleAuthURLResponse> {
        try {
            const result = await SupabaseConfig.signInWithGoogle();

            console.log('✅ Google OAuth URL generated');
            return result;
        } catch (error: any) {
            console.error('❌ Google OAuth URL generation failed:', error.message);
            throw new Error('OAUTH_URL_GENERATION_FAILED');
        }
    }

    // ============================================
    // 4. SUPABASE TOKEN EXCHANGE (OAuth Callback)
    // ============================================
    async supabaseExchange(data: SupabaseExchangeInput): Promise<AuthResponse> {
        try {
            const { accessToken } = data;

            // Get user from Supabase token
            const supabaseUser = await SupabaseConfig.getUserFromToken(accessToken);

            if (!supabaseUser) {
                throw new Error('INVALID_SUPABASE_TOKEN');
            }

            const phone = supabaseUser.phone;
            const email = supabaseUser.email;

            // Find user in our database
            let user = await this.prisma.user.findFirst({
                where: {
                    OR: [
                        { phone: phone || undefined },
                        { email: email || undefined },
                        { supabaseAuthId: supabaseUser.id },
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
                throw new Error('USER_NOT_REGISTERED');
            }

            // ✅ Sync profile data from Supabase OAuth
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    supabaseAuthId: supabaseUser.id,
                    email: email || user.email,
                    firstName: supabaseUser.user_metadata?.first_name || user.firstName,
                    lastName: supabaseUser.user_metadata?.last_name || user.lastName,
                    profilePhotoUrl: supabaseUser.user_metadata?.avatar_url || user.profilePhotoUrl,
                    isVerified: true,
                    verifiedAt: new Date(),
                    lastLoginAt: new Date(),
                },
                include: {
                    userRoles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });

            // ✅ Validate user status
            this.validateUserStatus(user);

            // ✅ Generate tokens and session
            return await this.generateAuthResponse(user, supabaseUser.id);

        } catch (error: any) {
            console.error('❌ Supabase token exchange failed:', error.message);
            throw error;
        }
    }

    // ============================================
    // 5. REFRESH ACCESS TOKEN
    // ============================================
    async refreshAccessToken(refreshTokenValue: string): Promise<{ token: string; refreshToken: string }> {
        try {
            // Find refresh token with user data
            const refreshToken = await this.prisma.refreshToken.findUnique({
                where: { token: refreshTokenValue },
                include: {
                    user: {
                        include: {
                            userRoles: {
                                include: {
                                    role: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!refreshToken) {
                throw new Error('INVALID_REFRESH_TOKEN');
            }

            // ✅ Validate refresh token
            if (refreshToken.isRevoked) {
                throw new Error('REFRESH_TOKEN_REVOKED');
            }

            if (new Date() > refreshToken.expiresAt) {
                throw new Error('REFRESH_TOKEN_EXPIRED');
            }

            const user = refreshToken.user;

            // ✅ Validate user status
            this.validateUserStatus(user);

            // Get user's primary role
            const primaryRole = user.userRoles[0]?.role?.name || 'RIDER';

            // ✅ Generate new tokens atomically
            const result = await this.prisma.$transaction(async (tx) => {
                // Generate new access token
                const newToken = generateToken({
                    id: user.id,
                    supabaseAuthId: user.supabaseAuthId || '',
                    phone: user.phone,
                    email: user.email || '',
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    role: primaryRole,
                });

                // Create new refresh token
                const newRefreshToken = await this.createRefreshToken(user.id, tx);

                // Revoke old refresh token
                await tx.refreshToken.update({
                    where: { id: refreshToken.id },
                    data: {
                        isRevoked: true,
                        revokedAt: new Date(),
                        replacedBy: newRefreshToken.id,
                    },
                });

                // Create new session
                await this.createSession(user.id, newToken, tx);

                return { token: newToken, refreshToken: newRefreshToken.token };
            });

            console.log('✅ Access token refreshed for user:', user.id);

            return result;
        } catch (error: any) {
            console.error('❌ Token refresh failed:', error.message);
            throw error;
        }
    }

    // ============================================
    // 6. LOGOUT
    // ============================================
    async logout(userId: string, token: string): Promise<void> {
        try {
            // ✅ Use transaction for atomic logout
            await this.prisma.$transaction(async (tx) => {
                // Revoke all active sessions
                await tx.session.updateMany({
                    where: { userId, isActive: true },
                    data: {
                        isActive: false,
                        revokedAt: new Date(),
                    },
                });

                // Revoke all active refresh tokens
                await tx.refreshToken.updateMany({
                    where: { userId, isRevoked: false },
                    data: {
                        isRevoked: true,
                        revokedAt: new Date(),
                    },
                });
            });

            // ✅ Blacklist current token in cache
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
            await this.cache.set(CacheKeys.token.blacklist(tokenHash), true, CacheTTL.TOKEN_BLACKLIST);

            // ✅ Clear user cache
            await this.cache.delete(CacheKeys.user.byId(userId));
            await this.cache.deletePattern(CacheKeys.session.pattern());

            console.log('✅ User logged out successfully:', userId);
        } catch (error: any) {
            console.error('❌ Logout failed:', error.message);
            throw new Error('LOGOUT_FAILED');
        }
    }

    // ============================================
    // 7. GET CURRENT USER
    // ============================================
    async getCurrentUser(userId: string): Promise<User> {
        try {
            // ✅ Try cache first
            const cached = await this.cache.get<User>(CacheKeys.user.byId(userId));
            if (cached) {
                console.log('✅ User retrieved from cache:', userId);
                return cached;
            }

            // ✅ Fetch from database
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new Error('USER_NOT_FOUND');
            }

            // ✅ Cache for future requests
            await this.cache.set(CacheKeys.user.byId(userId), user, CacheTTL.USER_DATA);

            console.log('✅ User retrieved from database:', userId);
            return user;
        } catch (error: any) {
            console.error('❌ Get current user failed:', error.message);
            throw error;
        }
    }

    // ============================================
    // PRIVATE HELPER METHODS
    // ============================================

    /**
     * Create new user with default RIDER role in atomic transaction
     */
    private async createNewUserWithRole(phone: string, supabaseUser: any): Promise<UserWithRoles> {
        return await this.prisma.$transaction(async (tx) => {
            // Get RIDER role
            const riderRole = await tx.role.findUnique({
                where: { name: 'RIDER' },
            });

            if (!riderRole) {
                throw new Error('RIDER_ROLE_NOT_FOUND');
            }

            // Create user with role assignment
            const newUser = await tx.user.create({
                data: {
                    phone,
                    supabaseAuthId: supabaseUser.id,
                    email: supabaseUser.email,
                    isVerified: true,
                    verifiedAt: new Date(),
                    isActive: true,
                    userRoles: {
                        create: {
                            roleId: riderRole.id,
                        },
                    },
                },
                include: {
                    userRoles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });

            return newUser;
        });
    }

    /**
     * Sync existing user with Supabase data
     */
    private async syncExistingUser(user: UserWithRoles, supabaseUser: any): Promise<UserWithRoles> {
        // Only update if Supabase Auth ID is missing
        if (!user.supabaseAuthId) {
            return await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    supabaseAuthId: supabaseUser.id,
                    isVerified: true,
                    verifiedAt: new Date(),
                    lastLoginAt: new Date(),
                },
                include: {
                    userRoles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });
        }

        // Just update last login
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        return user;
    }

    /**
     * Validate user account status
     */
    private validateUserStatus(user: User): void {
        if (!user.isActive) {
            throw new Error('USER_INACTIVE');
        }

        if (user.isSuspended) {
            throw new Error('USER_SUSPENDED');
        }
    }

    /**
     * Generate complete auth response with tokens and session
     */
    private async generateAuthResponse(user: UserWithRoles, supabaseAuthId: string): Promise<AuthResponse> {
        // Get primary role
        const primaryRole = user.userRoles[0]?.role?.name || 'RIDER';

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            supabaseAuthId: supabaseAuthId,
            phone: user.phone,
            email: user.email || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: primaryRole,
        });

        // ✅ Create session and refresh token atomically
        const { refreshToken } = await this.prisma.$transaction(async (tx) => {
            const newRefreshToken = await this.createRefreshToken(user.id, tx);
            await this.createSession(user.id, token, tx);
            return { refreshToken: newRefreshToken };
        });

        // ✅ Cache user data (fire and forget)
        this.cacheUserData(user, supabaseAuthId).catch(err => 
            console.error('Failed to cache user data:', err)
        );

        return { user, token, refreshToken: refreshToken.token };
    }

    /**
     * Cache user data in multiple keys
     */
    private async cacheUserData(user: User, supabaseAuthId: string): Promise<void> {
        await Promise.all([
            this.cache.set(CacheKeys.user.byId(user.id), user, CacheTTL.USER_DATA),
            this.cache.set(CacheKeys.user.bySupabaseAuthId(supabaseAuthId), user, CacheTTL.USER_DATA),
            this.cache.set(CacheKeys.user.byPhone(user.phone), user, CacheTTL.USER_DATA),
        ]);
    }

    /**
     * Create refresh token (supports both direct and transaction usage)
     */
    private async createRefreshToken(
        userId: string, 
        tx?: Prisma.TransactionClient
    ): Promise<RefreshToken> {
        const token = crypto.randomBytes(32).toString('hex');
        const expiryDays = getEnv.session.refreshTokenExpiryDays();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        const prismaClient = tx || this.prisma;

        return await prismaClient.refreshToken.create({
            data: {
                userId,
                token,
                expiresAt,
            },
        });
    }

    /**
     * Create session (supports both direct and transaction usage)
     */
    private async createSession(
        userId: string, 
        token: string, 
        tx?: Prisma.TransactionClient
    ): Promise<Session> {
        const expiryDays = getEnv.session.expiryDays();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        const prismaClient = tx || this.prisma;

        return await prismaClient.session.create({
            data: {
                userId,
                token,
                expiresAt,
                isActive: true,
            },
        });
    }
}