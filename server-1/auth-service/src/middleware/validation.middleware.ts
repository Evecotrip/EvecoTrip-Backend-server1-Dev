// ============================================
// src/middleware/validation.middleware.ts
// ============================================
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

/**
 * Validation middleware factory for request body
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        errors,
      });
    }

    // Replace req.body with validated value
    req.body = value;
    next();
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        errors,
      });
    }

    req.query = value;
    next();
  };
};

/**
 * Validate route parameters
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid route parameters',
        errors,
      });
    }

    req.params = value;
    next();
  };
};
