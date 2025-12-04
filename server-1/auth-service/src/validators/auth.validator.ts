// ============================================
// src/validators/auth.validator.ts - PRODUCTION VERSION
// ============================================

import Joi from 'joi';

/**
 * Validation schemas for authentication endpoints
 */
export class AuthValidator {
  
  /**
   * Send OTP validation
   */
  static sendOTP = Joi.object({
    phone: Joi.string()
      .required()
      .pattern(/^\+[1-9]\d{1,14}$/)
      .messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Phone must be in E.164 format (e.g., +919876543210)',
        'any.required': 'Phone number is required',
      }),
  });

  /**
   * Verify OTP validation
   */
  static verifyOTP = Joi.object({
    phone: Joi.string()
      .required()
      .pattern(/^\+[1-9]\d{1,14}$/)
      .messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Phone must be in E.164 format (e.g., +919876543210)',
        'any.required': 'Phone number is required',
      }),

    otp: Joi.string()
      .required()
      .length(6)
      .pattern(/^[0-9]{6}$/)
      .messages({
        'string.empty': 'OTP is required',
        'string.length': 'OTP must be exactly 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
        'any.required': 'OTP is required',
      }),
  });

  /**
   * OAuth callback validation
   */
  static oauthCallback = Joi.object({
    accessToken: Joi.string()
      .required()
      .min(20)
      .messages({
        'string.empty': 'Access token is required',
        'string.min': 'Invalid access token format',
        'any.required': 'Access token is required',
      }),
  });

  /**
   * Refresh token validation
   */
  static refreshToken = Joi.object({
    refreshToken: Joi.string()
      .required()
      .min(32)
      .messages({
        'string.empty': 'Refresh token is required',
        'string.min': 'Invalid refresh token format',
        'any.required': 'Refresh token is required',
      }),
  });

  /**
   * Resend OTP validation
   */
  static resendOTP = Joi.object({
    phone: Joi.string()
      .required()
      .pattern(/^\+[1-9]\d{1,14}$/)
      .messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Phone must be in E.164 format (e.g., +919876543210)',
        'any.required': 'Phone number is required',
      }),
  });

  /**
   * Generate token validation (for testing/admin use)
   */
  static generateToken = Joi.object({
    userId: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.guid': 'userId must be a valid UUID',
      }),

    supabaseAuthId: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.guid': 'supabaseAuthId must be a valid UUID',
      }),
  }).or('userId', 'supabaseAuthId')
    .messages({
      'object.missing': 'Either userId or supabaseAuthId must be provided',
    });
}