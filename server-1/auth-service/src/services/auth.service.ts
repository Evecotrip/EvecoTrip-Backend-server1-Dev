// ============================================
// src/services/auth.service.ts
// Auth Service - Business Logic Layer
// ============================================

import { PrismaClient, User, Session, RefreshToken } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateToken } from '../utils/jwt.utils';
import ClerkConfig from '../config/clerk.config';
import { CacheService } from '../cache/cache.service';
import { CacheKeys } from '../cache/cache.keys';
import { CacheTTL } from '../cache/cache.ttl';
import { sendOTP } from '../utils/sms.utils';

interface RegisterInput {
  phone: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

interface LoginInput {
  phone: string;
  password?: string;
  otpCode?: string;
}

interface OTPVerificationInput {
  phone: string;
  otpCode: string;
  purpose: 'SIGNUP' | 'LOGIN' | 'RESET_PASSWORD';
}

interface ClerkExchangeInput {
  clerkUserId: string;
}

export class AuthService {
  private prisma: PrismaClient;
  private cache: CacheService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.cache = CacheService.getInstance();
  }

  // ============================================
  // 1. PHONE + PASSWORD REGISTRATION
  // ============================================
  async register(data: RegisterInput): Promise<{ user: User; token: string; refreshToken: string }> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: data.phone },
      });

      if (existingUser) {
        throw new Error('USER_ALREADY_EXISTS');
      }

      // Check email uniqueness if provided
      if (data.email) {
        const existingEmail = await this.prisma.user.findUnique({
          where: { email: data.email },
        });

        if (existingEmail) {
          throw new Error('EMAIL_ALREADY_EXISTS');
        }
      }

      // Hash password if provided
      let passwordHash: string | undefined;
      if (data.password) {
        passwordHash = await bcrypt.hash(data.password, 12);
      }

      // Create user
      const user = await this.prisma.user.create({
        data: {
          phone: data.phone,
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          isActive: true,
          isVerified: false,
        },
      });

      // Assign default RIDER role
      const riderRole = await this.prisma.role.findUnique({
        where: { name: 'RIDER' },
      });

      if (riderRole) {
        await this.prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: riderRole.id,
          },
        });
      }

      // Generate tokens
      const token = generateToken({
        id: user.id,
        clerkUid: '', // No Clerk ID for phone registration
        phone: user.phone,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: 'RIDER', // Default role
      });

      const refreshToken = await this.createRefreshToken(user.id);

      // Create session
      await this.createSession(user.id, token);

      // Cache user data
      await this.cache.set(CacheKeys.user.byId(user.id), user, CacheTTL.USER_DATA);

      console.log('✅ User registered successfully:', user.id);

      return { user, token, refreshToken: refreshToken.token };
    } catch (error: any) {
      console.error('❌ Registration failed:', error.message);
      throw error;
    }
  }

  // ============================================
  // 2. PHONE + PASSWORD LOGIN
  // ============================================
  async login(data: LoginInput): Promise<{ user: User; token: string; refreshToken: string }> {
    try {
      // Find user by phone
      const user = await this.prisma.user.findUnique({
        where: { phone: data.phone },
      });

      if (!user) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('USER_SUSPENDED');
      }

      // Check if user is suspended
      if (user.isSuspended) {
        throw new Error('USER_SUSPENDED');
      }

      // Verify password if provided
      if (data.password) {
        if (!user.passwordHash) {
          throw new Error('PASSWORD_NOT_SET');
        }

        const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error('INVALID_CREDENTIALS');
        }
      } else if (data.otpCode) {
        // Verify OTP
        await this.verifyOTP({
          phone: data.phone,
          otpCode: data.otpCode,
          purpose: 'LOGIN',
        });
      } else {
        throw new Error('PASSWORD_OR_OTP_REQUIRED');
      }

      // Get user's primary role
      const userWithRoles = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      const primaryRole = userWithRoles?.userRoles[0]?.role?.name || 'RIDER';

      // Generate tokens
      const token = generateToken({
        id: user.id,
        clerkUid: '', // No Clerk ID for phone login
        phone: user.phone,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: primaryRole,
      });

      const refreshToken = await this.createRefreshToken(user.id);

      // Create session
      await this.createSession(user.id, token);

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Cache user data
      await this.cache.set(CacheKeys.user.byId(user.id), user, CacheTTL.USER_DATA);

      console.log('✅ User logged in successfully:', user.id);

      return { user, token, refreshToken: refreshToken.token };
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  }

  // ============================================
  // 3. CLERK AUTHENTICATION (OAuth)
  // ============================================
  /**
   * Clerk OAuth Flow:
   * 1. User authenticates with Clerk (Google/Facebook)
   * 2. Clerk validates and returns clerkUserId
   * 3. We fetch user data from Clerk
   * 4. Check if user exists in our database
   * 5. If exists: Update profile and generate OUR JWT
   * 6. If not exists: Return error (must complete registration first)
   * 
   * Note: We generate OUR OWN JWT tokens, not using Clerk tokens
   */
  async clerkExchange(data: ClerkExchangeInput): Promise<{ user: User; token: string; refreshToken: string }> {
    try {
      console.log('🔄 Processing Clerk OAuth exchange...');

      // Step 1: Get user from Clerk (validates Clerk token)
      const clerkUser = await ClerkConfig.getUserById(data.clerkUserId);

      if (!clerkUser) {
        throw new Error('CLERK_USER_NOT_FOUND');
      }

      // Step 2: Extract phone and email from Clerk
      const phone = clerkUser.phoneNumbers?.[0]?.phoneNumber;
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;

      if (!phone && !email) {
        throw new Error('PHONE_OR_EMAIL_REQUIRED');
      }

      console.log('✅ Clerk user validated:', data.clerkUserId);

      // Step 3: Check if user exists in OUR database
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { phone: phone || undefined },
            { email: email || undefined },
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

      // Step 4: If user doesn't exist, they must complete registration
      if (!user) {
        console.log('⚠️ User not found in database, must complete registration');
        throw new Error('USER_NOT_REGISTERED');
      }

      // Step 5: Update user profile from Clerk (sync data)
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: clerkUser.firstName || user.firstName,
          lastName: clerkUser.lastName || user.lastName,
          profilePhotoUrl: clerkUser.imageUrl || user.profilePhotoUrl,
          email: email || user.email,
          lastLoginAt: new Date(),
          isVerified: true, // Clerk users are verified
          verifiedAt: user.verifiedAt || new Date(),
        },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      console.log('✅ User profile synced from Clerk:', user.id);

      // Step 6: Get user's primary role
      const primaryRole = user.userRoles[0]?.role?.name || 'RIDER';

      // Step 7: Generate OUR JWT token (NOT Clerk token)
      const token = generateToken({
        id: user.id,
        clerkUid: data.clerkUserId,
        phone: user.phone,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: primaryRole,
      });

      // Step 8: Generate refresh token
      const refreshToken = await this.createRefreshToken(user.id);

      // Step 9: Create session
      await this.createSession(user.id, token);

      // Step 10: Cache user data
      await this.cache.set(CacheKeys.user.byId(user.id), user, CacheTTL.USER_DATA);
      await this.cache.set(CacheKeys.user.byClerkId(data.clerkUserId), user, CacheTTL.USER_DATA);

      console.log('✅ JWT token generated for Clerk user:', user.id);

      return { user, token, refreshToken: refreshToken.token };
    } catch (error: any) {
      console.error('❌ Clerk exchange failed:', error.message);
      throw error;
    }
  }

  // ============================================
  // 4. OTP GENERATION
  // ============================================
  async sendOTP(phone: string, purpose: 'SIGNUP' | 'LOGIN' | 'RESET_PASSWORD'): Promise<{ success: boolean }> {
    try {
      // Generate 6-digit OTP
      const otpCode = crypto.randomInt(100000, 999999).toString();

      // Check if user exists for LOGIN/RESET_PASSWORD
      if (purpose === 'LOGIN' || purpose === 'RESET_PASSWORD') {
        const user = await this.prisma.user.findUnique({
          where: { phone },
        });

        if (!user) {
          throw new Error('USER_NOT_FOUND');
        }
      }

      // Check if user already exists for SIGNUP
      if (purpose === 'SIGNUP') {
        const user = await this.prisma.user.findUnique({
          where: { phone },
        });

        if (user) {
          throw new Error('USER_ALREADY_EXISTS');
        }
      }

      // Delete any existing OTPs for this phone and purpose
      await this.prisma.otpVerification.deleteMany({
        where: {
          phone,
          purpose,
        },
      });

      // Create new OTP
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await this.prisma.otpVerification.create({
        data: {
          phone,
          otpCode,
          purpose,
          expiresAt,
          attempts: 0,
        },
      });

      // Send OTP via SMS (AWS SNS)
      await sendOTP(phone, otpCode);

      console.log('✅ OTP sent successfully:', phone);

      return { success: true };
    } catch (error: any) {
      console.error('❌ OTP send failed:', error.message);
      throw error;
    }
  }

  // ============================================
  // 5. OTP VERIFICATION
  // ============================================
  async verifyOTP(data: OTPVerificationInput): Promise<{ success: boolean; userId?: string }> {
    try {
      // Find OTP
      const otpRecord = await this.prisma.otpVerification.findFirst({
        where: {
          phone: data.phone,
          purpose: data.purpose,
          isVerified: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!otpRecord) {
        throw new Error('OTP_NOT_FOUND');
      }

      // Check if OTP is expired
      if (new Date() > otpRecord.expiresAt) {
        throw new Error('OTP_EXPIRED');
      }

      // Check attempts
      if (otpRecord.attempts >= 3) {
        throw new Error('MAX_ATTEMPTS_EXCEEDED');
      }

      // Verify OTP
      if (otpRecord.otpCode !== data.otpCode) {
        // Increment attempts
        await this.prisma.otpVerification.update({
          where: { id: otpRecord.id },
          data: { attempts: otpRecord.attempts + 1 },
        });

        throw new Error('INVALID_OTP');
      }

      // Mark OTP as verified
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Get or create user
      let user = await this.prisma.user.findUnique({
        where: { phone: data.phone },
      });

      if (!user && data.purpose === 'SIGNUP') {
        user = await this.prisma.user.create({
          data: {
            phone: data.phone,
            isActive: true,
            isVerified: true,
            verifiedAt: new Date(),
          },
        });
      }

      console.log('✅ OTP verified successfully:', data.phone);

      return { success: true, userId: user?.id };
    } catch (error: any) {
      console.error('❌ OTP verification failed:', error.message);
      throw error;
    }
  }

  // ============================================
  // 6. REFRESH TOKEN
  // ============================================
  async refreshAccessToken(oldRefreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      // Find refresh token
      const refreshTokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: oldRefreshToken },
      });

      if (!refreshTokenRecord) {
        throw new Error('INVALID_REFRESH_TOKEN');
      }

      // Check if token is revoked
      if (refreshTokenRecord.isRevoked) {
        throw new Error('TOKEN_REVOKED');
      }

      // Check if token is expired
      if (new Date() > refreshTokenRecord.expiresAt) {
        throw new Error('TOKEN_EXPIRED');
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: refreshTokenRecord.userId },
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Get user's primary role
      const userWithRoles = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      const primaryRole = userWithRoles?.userRoles[0]?.role?.name || 'RIDER';

      // Generate new tokens
      const newToken = generateToken({
        id: user.id,
        clerkUid: '', // Empty for non-Clerk users
        phone: user.phone,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: primaryRole,
      });

      const newRefreshToken = await this.createRefreshToken(user.id);

      // Revoke old refresh token
      await this.prisma.refreshToken.update({
        where: { id: refreshTokenRecord.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          replacedBy: newRefreshToken.id,
        },
      });

      // Create new session
      await this.createSession(user.id, newToken);

      console.log('✅ Token refreshed successfully:', user.id);

      return { token: newToken, refreshToken: newRefreshToken.token };
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error.message);
      throw error;
    }
  }

  // ============================================
  // 7. LOGOUT
  // ============================================
  async logout(userId: string, token: string): Promise<{ success: boolean }> {
    try {
      // Revoke all sessions for this user
      await this.prisma.session.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      // Revoke all refresh tokens
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });

      // Blacklist current token
      const tokenHash = this.hashToken(token);
      await this.cache.set(
        CacheKeys.token.blacklist(tokenHash),
        true,
        CacheTTL.TOKEN_BLACKLIST
      );

      // Clear user cache
      await this.cache.delete(CacheKeys.user.byId(userId));

      console.log('✅ User logged out successfully:', userId);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Logout failed:', error.message);
      throw error;
    }
  }

  // ============================================
  // 8. PASSWORD RESET
  // ============================================
  async resetPassword(phone: string, otpCode: string, newPassword: string): Promise<{ success: boolean }> {
    try {
      // Verify OTP
      await this.verifyOTP({
        phone,
        otpCode,
        purpose: 'RESET_PASSWORD',
      });

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { phone },
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Revoke all sessions and refresh tokens
      await this.prisma.session.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      });

      await this.prisma.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true, revokedAt: new Date() },
      });

      console.log('✅ Password reset successfully:', user.id);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Password reset failed:', error.message);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async createRefreshToken(userId: string): Promise<RefreshToken> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  private async createSession(userId: string, token: string): Promise<Session> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return await this.prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
        isActive: true,
      },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
  }

  // ============================================
  // GET USER BY ID (with cache)
  // ============================================
  async getUserById(userId: string): Promise<User | null> {
    try {
      // Try cache first
      const cachedUser = await this.cache.get<User>(CacheKeys.user.byId(userId));
      if (cachedUser) {
        console.log('✅ User cache HIT:', userId);
        return cachedUser;
      }

      // Cache miss - get from database
      console.log('⚠️ User cache MISS:', userId);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        // Cache user data
        await this.cache.set(CacheKeys.user.byId(userId), user, CacheTTL.USER_DATA);
      }

      return user;
    } catch (error: any) {
      console.error('❌ Get user failed:', error.message);
      throw error;
    }
  }

  // ============================================
  // 9. GENERATE JWT TOKEN (Admin/Testing Use)
  // ============================================
  /**
   * Generate JWT token for existing user
   * Use cases:
   * - After Clerk OAuth validation
   * - Admin token generation
   * - Testing purposes
   * 
   * @param userId - Our database user UUID
   * @param clerkUserId - Optional Clerk user ID
   */
  async generateUserToken(userId: string, clerkUserId?: string): Promise<{ user: User; token: string; refreshToken: string }> {
    try {
      console.log('🔐 Generating token for user:', userId);

      // Get user with roles
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('USER_INACTIVE');
      }

      // Check if user is suspended
      if (user.isSuspended) {
        throw new Error('USER_SUSPENDED');
      }

      // Get primary role
      const primaryRole = user.userRoles[0]?.role?.name || 'RIDER';

      // Generate JWT token
      const token = generateToken({
        id: user.id,
        clerkUid: clerkUserId || '', // Use provided Clerk ID or empty
        phone: user.phone,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: primaryRole,
      });

      // Generate refresh token
      const refreshToken = await this.createRefreshToken(user.id);

      // Create session
      await this.createSession(user.id, token);

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Cache user data
      await this.cache.set(CacheKeys.user.byId(user.id), user, CacheTTL.USER_DATA);
      if (clerkUserId) {
        await this.cache.set(CacheKeys.user.byClerkId(clerkUserId), user, CacheTTL.USER_DATA);
      }

      console.log('✅ Token generated successfully for user:', user.id);

      return { user, token, refreshToken: refreshToken.token };
    } catch (error: any) {
      console.error('❌ Token generation failed:', error.message);
      throw error;
    }
  }

  // ============================================
  // 10. GENERATE TOKEN BY CLERK ID
  // ============================================
  /**
   * Generate JWT token by finding user with Clerk ID
   * 
   * @param clerkUserId - Clerk user ID
   */
  async generateTokenByClerkId(clerkUserId: string): Promise<{ user: User; token: string; refreshToken: string }> {
    try {
      console.log('🔐 Generating token for Clerk user:', clerkUserId);

      // Get Clerk user data
      const clerkUser = await ClerkConfig.getUserById(clerkUserId);

      if (!clerkUser) {
        throw new Error('CLERK_USER_NOT_FOUND');
      }

      // Find user in our database by phone or email
      const phone = clerkUser.phoneNumbers?.[0]?.phoneNumber;
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;

      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { phone: phone || undefined },
            { email: email || undefined },
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
        throw new Error('USER_NOT_FOUND_IN_DATABASE');
      }

      // Use the common method
      return await this.generateUserToken(user.id, clerkUserId);
    } catch (error: any) {
      console.error('❌ Token generation by Clerk ID failed:', error.message);
      throw error;
    }
  }
}