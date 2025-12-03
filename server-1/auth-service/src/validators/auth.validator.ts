// ============================================
// src/validators/auth.validator.ts
// Auth Validation Schemas (Joi)
// ============================================

import Joi from 'joi';

/**
 * Validation schemas for authentication endpoints
 */
export class AuthValidator {
  
  // ============================================
  // 1. REGISTER VALIDATION
  // ============================================
  static register = Joi.object({
    phone: Joi.string()
      .required()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Invalid phone number format (E.164 format required)',
        'any.required': 'Phone number is required',
      }),

    email: Joi.string()
      .email()
      .optional()
      .allow(null, '')
      .messages({
        'string.email': 'Invalid email format',
      }),

    password: Joi.string()
      .min(8)
      .max(100)
      .optional()
      .allow(null, '')
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must not exceed 100 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      }),

    firstName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .allow(null, '')
      .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name must not exceed 50 characters',
      }),

    lastName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .allow(null, '')
      .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name must not exceed 50 characters',
      }),
  });

  // ============================================
  // 2. LOGIN VALIDATION
  // ============================================
  static login = Joi.object({
    phone: Joi.string()
      .required()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Invalid phone number format (E.164 format required)',
        'any.required': 'Phone number is required',
      }),

    password: Joi.string()
      .optional()
      .allow(null, '')
      .messages({
        'string.empty': 'Password cannot be empty',
      }),

    otpCode: Joi.string()
      .length(6)
      .pattern(/^\d{6}$/)
      .optional()
      .allow(null, '')
      .messages({
        'string.length': 'OTP must be exactly 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
      }),
  }).xor('password', 'otpCode').messages({
    'object.missing': 'Either password or OTP is required',
    'object.xor': 'Provide either password or OTP, not both',
  });

  // ============================================
  // 3. CLERK EXCHANGE VALIDATION
  // ============================================
  static clerkExchange = Joi.object({
    clerkUserId: Joi.string()
      .required()
      .min(10)
      .max(100)
      .pattern(/^user_[a-zA-Z0-9]+$/)
      .messages({
        'string.empty': 'Clerk user ID is required',
        'string.pattern.base': 'Invalid Clerk user ID format (must start with "user_")',
        'any.required': 'Clerk user ID is required',
      }),
  });

  // ============================================
  // 4. SEND OTP VALIDATION
  // ============================================
  static sendOTP = Joi.object({
    phone: Joi.string()
      .required()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Invalid phone number format (E.164 format required)',
        'any.required': 'Phone number is required',
      }),

    purpose: Joi.string()
      .required()
      .valid('SIGNUP', 'LOGIN', 'RESET_PASSWORD')
      .messages({
        'string.empty': 'Purpose is required',
        'any.only': 'Purpose must be one of: SIGNUP, LOGIN, RESET_PASSWORD',
        'any.required': 'Purpose is required',
      }),
  });

  // ============================================
  // 5. VERIFY OTP VALIDATION
  // ============================================
  static verifyOTP = Joi.object({
    phone: Joi.string()
      .required()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Invalid phone number format (E.164 format required)',
        'any.required': 'Phone number is required',
      }),

    otpCode: Joi.string()
      .required()
      .length(6)
      .pattern(/^\d{6}$/)
      .messages({
        'string.empty': 'OTP is required',
        'string.length': 'OTP must be exactly 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
        'any.required': 'OTP is required',
      }),

    purpose: Joi.string()
      .required()
      .valid('SIGNUP', 'LOGIN', 'RESET_PASSWORD')
      .messages({
        'string.empty': 'Purpose is required',
        'any.only': 'Purpose must be one of: SIGNUP, LOGIN, RESET_PASSWORD',
        'any.required': 'Purpose is required',
      }),
  });

  // ============================================
  // 6. REFRESH TOKEN VALIDATION
  // ============================================
  static refresh = Joi.object({
    refreshToken: Joi.string()
      .required()
      .min(64)
      .max(256)
      .messages({
        'string.empty': 'Refresh token is required',
        'string.min': 'Invalid refresh token format',
        'string.max': 'Invalid refresh token format',
        'any.required': 'Refresh token is required',
      }),
  });

  // ============================================
  // 7. RESET PASSWORD VALIDATION
  // ============================================
  static resetPassword = Joi.object({
    phone: Joi.string()
      .required()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Invalid phone number format (E.164 format required)',
        'any.required': 'Phone number is required',
      }),

    otpCode: Joi.string()
      .required()
      .length(6)
      .pattern(/^\d{6}$/)
      .messages({
        'string.empty': 'OTP is required',
        'string.length': 'OTP must be exactly 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
        'any.required': 'OTP is required',
      }),

    newPassword: Joi.string()
      .required()
      .min(8)
      .max(100)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .messages({
        'string.empty': 'New password is required',
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must not exceed 100 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'New password is required',
      }),
  });

  // ============================================
  // 8. CHANGE PASSWORD VALIDATION (For future use)
  // ============================================
  static changePassword = Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'string.empty': 'Current password is required',
        'any.required': 'Current password is required',
      }),

    newPassword: Joi.string()
      .required()
      .min(8)
      .max(100)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .messages({
        'string.empty': 'New password is required',
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must not exceed 100 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'New password is required',
      }),

    confirmPassword: Joi.string()
      .required()
      .valid(Joi.ref('newPassword'))
      .messages({
        'string.empty': 'Confirm password is required',
        'any.only': 'Passwords do not match',
        'any.required': 'Confirm password is required',
      }),
  });

  // ============================================
  // 9. UPDATE PROFILE VALIDATION (For future use)
  // ============================================
  static updateProfile = Joi.object({
    email: Joi.string()
      .email()
      .optional()
      .allow(null, '')
      .messages({
        'string.email': 'Invalid email format',
      }),

    firstName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .allow(null, '')
      .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name must not exceed 50 characters',
      }),

    lastName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .allow(null, '')
      .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name must not exceed 50 characters',
      }),

    dateOfBirth: Joi.date()
      .optional()
      .allow(null)
      .max('now')
      .messages({
        'date.max': 'Date of birth cannot be in the future',
      }),

    gender: Joi.string()
      .optional()
      .allow(null, '')
      .valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')
      .messages({
        'any.only': 'Gender must be one of: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY',
      }),
  });

  // ============================================
  // 10. WEBHOOK VALIDATION (For Clerk)
  // ============================================
  static webhook = Joi.object({
    type: Joi.string().required(),
    data: Joi.object().required(),
  }).unknown(true); // Allow additional fields

  // ============================================
// ADD THESE TO auth.validator.ts
// ============================================

  // ============================================
  // 11. GENERATE TOKEN BY USER ID
  // ============================================
  static generateToken = Joi.object({
    userId: Joi.string()
      .required()
      .uuid()
      .messages({
        'string.empty': 'User ID is required',
        'string.guid': 'Invalid user ID format (must be UUID)',
        'any.required': 'User ID is required',
      }),

    clerkUserId: Joi.string()
      .optional()
      .allow(null, '')
      .pattern(/^user_[a-zA-Z0-9]+$/)
      .messages({
        'string.pattern.base': 'Invalid Clerk user ID format (must start with "user_")',
      }),
  });

  // ============================================
  // 12. GENERATE TOKEN BY CLERK ID
  // ============================================
  static generateTokenByClerkId = Joi.object({
    clerkUserId: Joi.string()
      .required()
      .min(10)
      .max(100)
      .pattern(/^user_[a-zA-Z0-9]+$/)
      .messages({
        'string.empty': 'Clerk user ID is required',
        'string.pattern.base': 'Invalid Clerk user ID format (must start with "user_")',
        'any.required': 'Clerk user ID is required',
      }),
  });
}