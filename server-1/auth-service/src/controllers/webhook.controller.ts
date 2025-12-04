// // ============================================
// // src/controllers/webhook.controller.ts
// // Webhook Controller - Clerk Webhooks Only
// // ============================================

// import { Request, Response } from 'express';
// import { prisma } from '../config/database.config';
// import ClerkConfig from '../config/clerk.config';
// import { CacheService } from '../cache/cache.service';
// import { CacheKeys } from '../cache/cache.keys';

// export class WebhookController {
//   private cache: CacheService;

//   constructor() {
//     this.cache = CacheService.getInstance();
//   }

//   /**
//    * Handle Clerk webhook events
//    * 
//    * Flow:
//    * 1. Clerk validates OAuth (Google/Facebook)
//    * 2. User completes registration in our app (with referral code)
//    * 3. We sync user data from Clerk
//    * 4. Webhooks keep data in sync
//    */
//   handleClerkWebhook = async (req: Request, res: Response): Promise<void> => {
//     try {
//       console.log('📥 Received Clerk webhook');

//       // Get raw body for signature verification
//       const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
//       const headers = req.headers;

//       // Verify webhook signature
//       const isValid = ClerkConfig.verifyWebhookSignature(payload, headers);

//       if (!isValid) {
//         console.error('❌ Invalid webhook signature');
//         res.status(401).json({
//           success: false,
//           error: 'INVALID_SIGNATURE',
//           message: 'Invalid webhook signature',
//         });
//         return;
//       }

//       // Parse webhook data
//       const webhookData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
//       const { type, data } = webhookData;

//       console.log('📋 Webhook event type:', type);
//       console.log('📋 Clerk user ID:', data.id);

//       // Handle different webhook events
//       switch (type) {
//         case 'user.created':
//           await this.handleUserCreated(data);
//           break;

//         case 'user.updated':
//           await this.handleUserUpdated(data);
//           break;

//         case 'user.deleted':
//           await this.handleUserDeleted(data);
//           break;

//         default:
//           console.log('ℹ️ Unhandled webhook event type:', type);
//       }

//       res.status(200).json({
//         success: true,
//         message: 'Webhook processed successfully',
//       });
//     } catch (error: any) {
//       console.error('❌ Webhook processing error:', error);
//       res.status(500).json({
//         success: false,
//         error: 'WEBHOOK_PROCESSING_ERROR',
//         message: 'Error processing webhook',
//         details: error.message,
//       });
//     }
//   };

//   /**
//    * Handle user.created event
//    * Note: We DON'T auto-create user in DB
//    * User must complete registration flow with referral code
//    */
//   private async handleUserCreated(clerkUser: any): Promise<void> {
//     try {
//       console.log('📝 User created in Clerk:', clerkUser.id);
//       console.log('⏳ Waiting for user to complete registration with referral code...');

//       // Store Clerk user data in cache temporarily (1 hour)
//       // This will be used during registration
//       const cacheKey = CacheKeys.user.byClerkId(clerkUser.id);
//       await this.cache.set(cacheKey, clerkUser, 3600);

//       console.log('✅ Clerk user data cached for registration');
//     } catch (error: any) {
//       console.error('❌ Error handling user.created:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * Handle user.updated event
//    * Sync Clerk updates to our database if user exists
//    */
//   private async handleUserUpdated(clerkUser: any): Promise<void> {
//     try {
//       console.log('📝 User updated in Clerk:', clerkUser.id);

//       // Find user in our database by Clerk ID
//       const user = await prisma.user.findFirst({
//         where: {
//           OR: [
//             { phone: clerkUser.phone_numbers?.[0]?.phone_number },
//             { email: clerkUser.email_addresses?.[0]?.email_address },
//           ],
//         },
//       });

//       if (!user) {
//         console.log('ℹ️ User not in our database yet, skipping update');
//         return;
//       }

//       // Update user data from Clerk
//       const updatedUser = await prisma.user.update({
//         where: { id: user.id },
//         data: {
//           email: clerkUser.email_addresses?.[0]?.email_address || user.email,
//           firstName: clerkUser.first_name || user.firstName,
//           lastName: clerkUser.last_name || user.lastName,
//           profilePhotoUrl: clerkUser.image_url || user.profilePhotoUrl,
//           updatedAt: new Date(),
//         },
//       });

//       // Clear user cache to force refresh
//       await this.cache.delete(CacheKeys.user.byId(user.id));

//       console.log('✅ User synced from Clerk:', updatedUser.id);
//     } catch (error: any) {
//       console.error('❌ Error handling user.updated:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * Handle user.deleted event
//    * Mark user as deleted in our database
//    */
//   private async handleUserDeleted(clerkUserId: string): Promise<void> {
//     try {
//       console.log('📝 User deleted in Clerk:', clerkUserId);

//       // Find user in our database
//       // Note: We can't use clerkUid directly since we don't store it
//       // We'll need to find by phone or email from webhook data
      
//       console.log('ℹ️ User deletion handled - implement soft delete if needed');
      
//       // TODO: Implement soft delete logic
//       // const user = await prisma.user.findFirst({ where: { ... } });
//       // if (user) {
//       //   await prisma.user.update({
//       //     where: { id: user.id },
//       //     data: {
//       //       deletedAt: new Date(),
//       //       isActive: false,
//       //     },
//       //   });
//       // }
//     } catch (error: any) {
//       console.error('❌ Error handling user.deleted:', error.message);
//       throw error;
//     }
//   }
// }