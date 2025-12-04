// // ============================================
// // src/routes/webhook.routes.ts
// // Webhook Routes - Clerk Webhooks
// // ============================================

// import { Router } from 'express';
// import { WebhookController } from '../controllers/webhook.controller';
// import express from 'express';

// const router = Router();
// const webhookController = new WebhookController();

// /**
//  * @route   POST /api/webhooks/clerk
//  * @desc    Handle Clerk webhook events
//  * @access  Public (verified by signature)
//  * 
//  * IMPORTANT: 
//  * - Raw body is required for signature verification
//  * - Do NOT use express.json() middleware before this route
//  * - Signature verification happens inside controller
//  * 
//  * Events Handled:
//  * - user.created  → Cache Clerk data for registration
//  * - user.updated  → Sync updates to our database
//  * - user.deleted  → Mark user as deleted
//  */
// router.post(
//   '/clerk',
//   express.raw({ type: 'application/json' }),
//   webhookController.handleClerkWebhook
// );

// export default router;