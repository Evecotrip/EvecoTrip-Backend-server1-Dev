// ============================================
// src/routes/auth.routes.ts
// Auth Routes - API Endpoint Definitions
// ============================================

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthValidator } from '../validators/auth.validator';
import { validate } from '../middleware/validation.middleware';
import { authenticateJWT } from '../middleware/auth.middleware';
import { authRateLimit, passwordResetRateLimit } from '../middleware/ratelimitRedis.middleware';

const router = Router();
const authController = new AuthController();

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

/**
 * @route   POST /api/auth/register
 * @desc    Register new user with phone + password
 * @access  Public
 */
router.post(
  '/register',
  authRateLimit,
  validate(AuthValidator.register),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login with phone + password/OTP
 * @access  Public
 */
router.post(
  '/login',
  authRateLimit,
  validate(AuthValidator.login),
  authController.login
);

/**
 * @route   POST /api/auth/clerk/exchange
 * @desc    Exchange Clerk token for JWT (OAuth flow)
 * @access  Public
 */
router.post(
  '/clerk/exchange',
  authRateLimit,
  validate(AuthValidator.clerkExchange),
  authController.clerkExchange
);

/**
 * @route   POST /api/auth/otp/send
 * @desc    Send OTP to phone number
 * @access  Public
 */
router.post(
  '/otp/send',
  authRateLimit,
  validate(AuthValidator.sendOTP),
  authController.sendOTP
);

/**
 * @route   POST /api/auth/otp/verify
 * @desc    Verify OTP code
 * @access  Public
 */
router.post(
  '/otp/verify',
  authRateLimit,
  validate(AuthValidator.verifyOTP),
  authController.verifyOTP
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  '/refresh',
  validate(AuthValidator.refresh),
  authController.refresh
);

/**
 * @route   POST /api/auth/password/reset
 * @desc    Reset password with OTP
 * @access  Public
 */
router.post(
  '/password/reset',
  passwordResetRateLimit,
  validate(AuthValidator.resetPassword),
  authController.resetPassword
);

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and revoke tokens
 * @access  Protected
 */
router.post(
  '/logout',
  authenticateJWT,
  authController.logout
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Protected
 */
router.get(
  '/me',
  authenticateJWT,
  authController.getCurrentUser
);

// ============================================
// ADD THESE ROUTES TO auth.routes.ts
// ============================================

/**
 * @route   POST /api/auth/generate-token
 * @desc    Generate JWT token for existing user by user ID
 * @access  Public (or Protected with admin role)
 * 
 * Use Cases:
 * - After Clerk OAuth validation
 * - Admin token generation
 * - Testing purposes
 */
router.post(
  '/generate-token',
  validate(AuthValidator.generateToken),
  authController.generateToken
);

/**
 * @route   POST /api/auth/generate-token/clerk
 * @desc    Generate JWT token by Clerk user ID
 * @access  Public
 * 
 * Flow:
 * 1. Validate Clerk user ID with Clerk API
 * 2. Find user in our database by phone/email
 * 3. Generate our JWT token
 */
router.post(
  '/generate-token/clerk',
  validate(AuthValidator.generateTokenByClerkId),
  authController.generateTokenByClerkId
);

// ============================================
// HEALTH CHECK
// ============================================

/**
 * @route   GET /api/auth/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get(
  '/health',
  authController.healthCheck
);

export default router;