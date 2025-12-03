// src/routes/index.ts
// Main routes aggregator
import express from 'express';
import authRoutes from './auth.routes';
import { authRateLimit } from '../middleware/ratelimitRedis.middleware';

const router = express.Router();

// Auth routes
router.use('/auth',authRateLimit, authRoutes);


export default router;