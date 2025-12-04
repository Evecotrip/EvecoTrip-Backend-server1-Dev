// // ============================================
// // src/config/clerk.config.ts
// // Clerk authentication configuration
// // ============================================
// import { Clerk } from '@clerk/clerk-sdk-node';
// import { getEnv } from './env.config';

// class ClerkConfig {
//   private static instance: ReturnType<typeof Clerk>;
//   private static isInitialized: boolean = false;

//   private constructor() {}

//   /**
//    * Get Clerk client instance (singleton)
//    */
//   public static getInstance(): ReturnType<typeof Clerk> {
//     if (!ClerkConfig.instance) {
//       const secretKey = getEnv.clerk.secretKey();

//       if (!secretKey) {
//         throw new Error('❌ CLERK_SECRET_KEY is not configured');
//       }

//       ClerkConfig.instance = Clerk({ secretKey });
//       ClerkConfig.isInitialized = true;
      
//       console.log('✅ Clerk initialized successfully');
//     }

//     return ClerkConfig.instance;
//   }

//   /**
//    * Check if Clerk is ready
//    */
//   public static isReady(): boolean {
//     return ClerkConfig.isInitialized;
//   }

//   /**
//    * Get user by Clerk ID
//    */
//   public static async getUserById(clerkUserId: string) {
//     try {
//       const clerk = ClerkConfig.getInstance();
//       const user = await clerk.users.getUser(clerkUserId);
      
//       console.log('✅ Retrieved user from Clerk:', clerkUserId);
//       return user;
//     } catch (error: any) {
//       console.error('❌ Error fetching user from Clerk:', error.message);
//       throw new Error(`Failed to fetch user from Clerk: ${error.message}`);
//     }
//   }

//   /**
//    * Get user by email
//    */
//   public static async getUserByEmail(email: string) {
//     try {
//       const clerk = ClerkConfig.getInstance();
//       const users = await clerk.users.getUserList({ emailAddress: [email] });
      
//       if (users && users.length > 0) {
//         return users[0];
//       }
      
//       return null;
//     } catch (error: any) {
//       console.error('❌ Error fetching user by email from Clerk:', error.message);
//       throw new Error(`Failed to fetch user by email: ${error.message}`);
//     }
//   }

//   /**
//    * Verify Clerk webhook signature
//    */
//   public static verifyWebhookSignature(
//     payload: string,
//     headers: Record<string, string | string[] | undefined>
//   ): boolean {
//     try {
//       const webhookSecret = getEnv.clerk.webhookSecret();

//       if (!webhookSecret) {
//         console.error('❌ CLERK_WEBHOOK_SECRET is not configured');
//         return false;
//       }

//       // Get Svix headers
//       const svixId = Array.isArray(headers['svix-id']) 
//         ? headers['svix-id'][0] 
//         : headers['svix-id'];
//       const svixTimestamp = Array.isArray(headers['svix-timestamp'])
//         ? headers['svix-timestamp'][0]
//         : headers['svix-timestamp'];
//       const svixSignature = Array.isArray(headers['svix-signature'])
//         ? headers['svix-signature'][0]
//         : headers['svix-signature'];

//       if (!svixId || !svixTimestamp || !svixSignature) {
//         console.error('❌ Missing required Svix webhook headers');
//         return false;
//       }

//       // Verify signature using Svix
//       try {
//         const { Webhook } = require('svix');
//         const wh = new Webhook(webhookSecret);

//         wh.verify(payload, {
//           'svix-id': svixId,
//           'svix-timestamp': svixTimestamp,
//           'svix-signature': svixSignature,
//         });

//         console.log('✅ Webhook signature verified successfully');
//         return true;
//       } catch (err: any) {
//         console.error('❌ Webhook signature verification failed:', err.message);
//         return false;
//       }
//     } catch (error: any) {
//       console.error('❌ Error verifying webhook signature:', error.message);
//       return false;
//     }
//   }

//   /**
//    * Update user metadata in Clerk
//    */
//   public static async updateUserMetadata(
//     clerkUserId: string,
//     metadata: Record<string, any>
//   ) {
//     try {
//       const clerk = ClerkConfig.getInstance();
//       const user = await clerk.users.updateUserMetadata(clerkUserId, {
//         publicMetadata: metadata,
//       });

//       console.log('✅ Updated user metadata in Clerk');
//       return user;
//     } catch (error: any) {
//       console.error('❌ Error updating user metadata:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * Delete user from Clerk
//    */
//   public static async deleteUser(clerkUserId: string) {
//     try {
//       const clerk = ClerkConfig.getInstance();
//       await clerk.users.deleteUser(clerkUserId);
      
//       console.log('✅ Deleted user from Clerk:', clerkUserId);
//     } catch (error: any) {
//       console.error('❌ Error deleting user from Clerk:', error.message);
//       throw error;
//     }
//   }
// }

// // Export singleton instance
// export default ClerkConfig;
// export const clerkClient = ClerkConfig.getInstance();