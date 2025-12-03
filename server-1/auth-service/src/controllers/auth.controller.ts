// ============================================
// src/controllers/auth.controller.ts
// Auth Controller - Request Handlers
// ============================================

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { prisma } from '../config/database.config';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService(prisma);
  }

  // ============================================
  // 1. REGISTER WITH PHONE + PASSWORD
  // ============================================
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone, email, password, firstName, lastName } = req.body;

      const result = await this.authService.register({
        phone,
        email,
        password,
        firstName,
        lastName,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: result.user.id,
            phone: result.user.phone,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            isVerified: result.user.isVerified,
          },
          token: result.token,
          refreshToken: result.refreshToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Register controller error:', error.message);

      if (error.message === 'USER_ALREADY_EXISTS') {
        res.status(409).json({
          success: false,
          error: 'USER_ALREADY_EXISTS',
          message: 'A user with this phone number already exists',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        res.status(409).json({
          success: false,
          error: 'EMAIL_ALREADY_EXISTS',
          message: 'A user with this email already exists',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  // ============================================
  // 2. LOGIN WITH PHONE + PASSWORD/OTP
  // ============================================
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone, password, otpCode } = req.body;

      const result = await this.authService.login({
        phone,
        password,
        otpCode,
      });

      res.status(200).json({
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
          },
          token: result.token,
          refreshToken: result.refreshToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Login controller error:', error.message);

      if (error.message === 'INVALID_CREDENTIALS') {
        res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid phone number or password',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'USER_SUSPENDED') {
        res.status(403).json({
          success: false,
          error: 'USER_SUSPENDED',
          message: 'Your account has been suspended. Please contact support.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'PASSWORD_NOT_SET') {
        res.status(400).json({
          success: false,
          error: 'PASSWORD_NOT_SET',
          message: 'Password not set for this account. Please use OTP login.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'PASSWORD_OR_OTP_REQUIRED') {
        res.status(400).json({
          success: false,
          error: 'PASSWORD_OR_OTP_REQUIRED',
          message: 'Either password or OTP is required for login',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  // ============================================
  // 3. CLERK AUTHENTICATION (OAuth Exchange)
  // ============================================
  clerkExchange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clerkUserId } = req.body;

      const result = await this.authService.clerkExchange({
        clerkUserId,
      });

      res.status(200).json({
        success: true,
        message: 'Clerk authentication successful',
        data: {
          user: {
            id: result.user.id,
            phone: result.user.phone,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            profilePhotoUrl: result.user.profilePhotoUrl,
            isVerified: result.user.isVerified,
          },
          token: result.token,
          refreshToken: result.refreshToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Clerk exchange controller error:', error.message);

      if (error.message === 'CLERK_USER_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'CLERK_USER_NOT_FOUND',
          message: 'Clerk user not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'PHONE_OR_EMAIL_REQUIRED') {
        res.status(400).json({
          success: false,
          error: 'PHONE_OR_EMAIL_REQUIRED',
          message: 'Phone number or email is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  // ============================================
  // 4. SEND OTP
  // ============================================
  sendOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone, purpose } = req.body;

      await this.authService.sendOTP(phone, purpose);

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          phone,
          expiresIn: 600, // 10 minutes in seconds
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Send OTP controller error:', error.message);

      if (error.message === 'USER_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User with this phone number not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'USER_ALREADY_EXISTS') {
        res.status(409).json({
          success: false,
          error: 'USER_ALREADY_EXISTS',
          message: 'User with this phone number already exists',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  // ============================================
  // 5. VERIFY OTP
  // ============================================
  verifyOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone, otpCode, purpose } = req.body;

      const result = await this.authService.verifyOTP({
        phone,
        otpCode,
        purpose,
      });

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          verified: result.success,
          userId: result.userId,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Verify OTP controller error:', error.message);

      if (error.message === 'OTP_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'OTP_NOT_FOUND',
          message: 'OTP not found or already used',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'OTP_EXPIRED') {
        res.status(400).json({
          success: false,
          error: 'OTP_EXPIRED',
          message: 'OTP has expired. Please request a new one.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'MAX_ATTEMPTS_EXCEEDED') {
        res.status(429).json({
          success: false,
          error: 'MAX_ATTEMPTS_EXCEEDED',
          message: 'Maximum verification attempts exceeded. Please request a new OTP.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'INVALID_OTP') {
        res.status(400).json({
          success: false,
          error: 'INVALID_OTP',
          message: 'Invalid OTP code',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  // ============================================
  // 6. REFRESH TOKEN
  // ============================================
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      const result = await this.authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: result.token,
          refreshToken: result.refreshToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Refresh token controller error:', error.message);

      if (error.message === 'INVALID_REFRESH_TOKEN') {
        res.status(401).json({
          success: false,
          error: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'TOKEN_REVOKED') {
        res.status(401).json({
          success: false,
          error: 'TOKEN_REVOKED',
          message: 'Refresh token has been revoked',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'TOKEN_EXPIRED') {
        res.status(401).json({
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'Refresh token has expired',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  // ============================================
  // 7. LOGOUT
  // ============================================
  logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const token = req.headers.authorization?.split(' ')[1];

      if (!userId || !token) {
        res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.authService.logout(userId, token);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Logout controller error:', error.message);
      next(error);
    }
  };

  // ============================================
  // 8. RESET PASSWORD
  // ============================================
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone, otpCode, newPassword } = req.body;

      await this.authService.resetPassword(phone, otpCode, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Reset password controller error:', error.message);

      if (error.message === 'USER_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  // ============================================
  // 9. GET CURRENT USER (Protected Route)
  // ============================================
  getCurrentUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const user = await this.authService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
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
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Get current user controller error:', error.message);
      next(error);
    }
  };

  // ============================================
  // 11. GENERATE TOKEN BY USER ID
  // ============================================
  generateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, clerkUserId } = req.body;

      const result = await this.authService.generateUserToken(userId, clerkUserId);

      res.status(200).json({
        success: true,
        message: 'Token generated successfully',
        data: {
          user: {
            id: result.user.id,
            phone: result.user.phone,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            profilePhotoUrl: result.user.profilePhotoUrl,
            isVerified: result.user.isVerified,
          },
          token: result.token,
          refreshToken: result.refreshToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Generate token controller error:', error.message);

      if (error.message === 'USER_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'USER_INACTIVE') {
        res.status(403).json({
          success: false,
          error: 'USER_INACTIVE',
          message: 'User account is inactive',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'USER_SUSPENDED') {
        res.status(403).json({
          success: false,
          error: 'USER_SUSPENDED',
          message: 'User account is suspended',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  // ============================================
  // 12. GENERATE TOKEN BY CLERK ID
  // ============================================
  generateTokenByClerkId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clerkUserId } = req.body;

      const result = await this.authService.generateTokenByClerkId(clerkUserId);

      res.status(200).json({
        success: true,
        message: 'Token generated successfully',
        data: {
          user: {
            id: result.user.id,
            phone: result.user.phone,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            profilePhotoUrl: result.user.profilePhotoUrl,
            isVerified: result.user.isVerified,
          },
          token: result.token,
          refreshToken: result.refreshToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Generate token by Clerk ID controller error:', error.message);

      if (error.message === 'CLERK_USER_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'CLERK_USER_NOT_FOUND',
          message: 'Clerk user not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error.message === 'USER_NOT_FOUND_IN_DATABASE') {
        res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND_IN_DATABASE',
          message: 'User not found in our database. Please complete registration first.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  // ============================================
  // 10. HEALTH CHECK
  // ============================================
  healthCheck = async (res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      message: 'Auth Service is healthy',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    });
  };
}