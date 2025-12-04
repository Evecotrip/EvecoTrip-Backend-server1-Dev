// ============================================
// src/routes/auth.routes.ts - PRODUCTION VERSION
// ============================================

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticateJWT } from '../middleware/auth.middleware';
import { AuthValidator } from '../validators/auth.validator';
import { authRateLimit } from '../middleware/ratelimitRedis.middleware';

const router = Router();

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

/**
 * @route   POST /api/v1/auth/phone/send-otp
 * @desc    Send OTP to phone number
 * @access  Public
 * @body    { phone: string }
 */
router.post(
  '/phone/send-otp',
  authRateLimit,
  validate(AuthValidator.sendOTP),
  AuthController.sendOTP
);

/**
 * @route   POST /api/v1/auth/phone/verify
 * @desc    Verify OTP and login/register
 * @access  Public
 * @body    { phone: string, otp: string }
 */
router.post(
  '/phone/verify',
  authRateLimit,
  validate(AuthValidator.verifyOTP),
  AuthController.verifyOTP
);

/**
 * @route   POST /api/v1/auth/phone/resend-otp
 * @desc    Resend OTP to phone number
 * @access  Public
 * @body    { phone: string }
 */
router.post(
  '/phone/resend-otp',
  authRateLimit,
  validate(AuthValidator.resendOTP),
  AuthController.resendOTP
);

/**
 * @route   GET /api/v1/auth/oauth/google
 * @desc    Get Google OAuth URL
 * @access  Public
 */
router.get(
  '/oauth/google',
  AuthController.getGoogleAuthURL
);

/**
 * @route   POST /api/v1/auth/oauth/callback
 * @desc    Exchange Supabase access token for our JWT
 * @access  Public
 * @body    { accessToken: string }
 */
router.post(
  '/oauth/callback',
  validate(AuthValidator.oauthCallback),
  AuthController.oauthCallback
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 * @body    { refreshToken: string }
 */
router.post(
  '/refresh',
  validate(AuthValidator.refreshToken),
  AuthController.refreshToken
);

/**
 * @route   POST /api/v1/auth/generate-token
 * @desc    Generate JWT token for testing/admin (use with caution)
 * @access  Public (Should be restricted in production)
 * @body    { userId?: string, supabaseAuthId?: string }
 */
router.post(
  '/generate-token',
  validate(AuthValidator.generateToken),
  AuthController.generateToken
);

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  authenticateJWT,
  AuthController.getCurrentUser
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (revoke tokens)
 * @access  Private
 */
router.post(
  '/logout',
  authenticateJWT,
  AuthController.logout
);

export default router;