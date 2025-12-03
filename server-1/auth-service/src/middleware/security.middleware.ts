// src/middleware/security.ts
import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// HTTPS enforcement middleware
export const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
};

// Helmet configuration for security headers
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.yourdomain.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Hide Express.js usage
  hidePoweredBy: true,
  
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  
  // Prevent MIME-type sniffing
  noSniff: true,
  
  // Enable XSS filtering
  xssFilter: true,
  
  // Referrer policy
  referrerPolicy: { policy: 'same-origin' }
});

// CORS configuration
export const corsConfig = cors({
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Parse allowed origins from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [
      'http://localhost:3000',     // React default
      'http://localhost:5173',     // Vite default
      'http://localhost:4200',     // Angular default
      'http://localhost:8080',     // Vue default
      'https://yourdomain.com',    // Production frontend
      'https://mlm-pro.vercel.app' // Production app
    ];
    
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('🚨 CORS Violation:', {
        origin,
        allowedOrigins,
        timestamp: new Date().toISOString()
      });
      callback(new Error('Not allowed by CORS policy'), false);
    }
  },
  
  // Allow credentials (cookies, authorization headers)
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  
  // Allowed headers
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-API-Key',
    'X-Client-Version'
  ],
  
  // Headers exposed to client
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  
  // Cache preflight requests for 24 hours
  maxAge: 86400,
  
  // Handle OPTIONS requests
  optionsSuccessStatus: 204
});

// Request size limiting middleware
export const requestSizeLimit = (req: Request, next: NextFunction) => {
  // Set different limits based on route
  const path = req.path.toLowerCase();
  
  if (path.includes('/upload') || path.includes('/file')) {
    // Higher limit for file uploads (50MB)
    req.body = { ...req.body, _sizeLimit: '50mb' };
  } else if (path.includes('/bulk') || path.includes('/import')) {
    // Medium limit for bulk operations (10MB)
    req.body = { ...req.body, _sizeLimit: '10mb' };
  } else {
    // Standard limit for regular requests (1MB)
    req.body = { ...req.body, _sizeLimit: '1mb' };
  }
  
  next();
};

// Security headers middleware for API responses
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // API-specific security headers
  res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
  res.setHeader('X-Response-Time', Date.now().toString());
  
  // Cache control for API responses
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }
  
  // Content type security
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  next();
};

// CORS error handler
export const corsErrorHandler = (err: any, res: Response, next: NextFunction) => {
  if (err.message === 'Not allowed by CORS policy') {
    return res.status(403).json({
      success: false,
      error: 'CORS_POLICY_VIOLATION',
      message: 'Your origin is not allowed to access this resource',
      allowedOrigins: process.env.NODE_ENV === 'development' 
        ? ['http://localhost:3000', 'http://localhost:5173'] 
        : ['Contact administrator for allowed origins']
    });
  }
  return next(err);
};

// Security logging middleware
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log security-relevant information
  const logData = {
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    referer: req.get('Referer'),
    timestamp: new Date().toISOString()
  };
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /cmd\.exe/i,  // Command injection
    /\/etc\/passwd/  // File inclusion
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || pattern.test(JSON.stringify(req.body))
  );
  
  if (isSuspicious) {
    console.warn('🚨 Suspicious Request Detected:', logData);
  }
  
  // Log response time on finish
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    if (responseTime > 5000) { // Log slow requests
      console.warn('⚠️ Slow Request:', { ...logData, responseTime, status: res.statusCode });
    }
  });
  
  next();
};