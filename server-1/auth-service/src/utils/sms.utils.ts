// ============================================
// src/utils/sms.utils.ts
// SMS Utilities (AWS SNS)
// ============================================

import AWS from 'aws-sdk';
import { getEnv } from '../config/env.config';

// Initialize AWS SNS
const sns = new AWS.SNS({
  region: getEnv.aws.region(),
  accessKeyId: getEnv.aws.accessKeyId(),
  secretAccessKey: getEnv.aws.secretAccessKey(),
});

/**
 * Send OTP via SMS using AWS SNS
 */
export const sendOTP = async (phone: string, otpCode: string): Promise<boolean> => {
  try {
    // Format phone number (ensure it starts with +)
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Create SMS message
    const message = `Your EvecoTrip verification code is: ${otpCode}. Valid for 10 minutes. Do not share this code with anyone.`;

    // Send SMS via AWS SNS
    const params: AWS.SNS.PublishInput = {
      PhoneNumber: formattedPhone,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: 'EvecoTrip',
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional', // Transactional SMS (higher priority)
        },
      },
    };

    const result = await sns.publish(params).promise();

    console.log('✅ OTP SMS sent successfully:', {
      phone: formattedPhone,
      messageId: result.MessageId,
    });

    return true;
  } catch (error: any) {
    console.error('❌ OTP SMS send failed:', error.message);
    throw new Error('SMS_SEND_FAILED');
  }
};

/**
 * Send general SMS notification
 */
export const sendSMS = async (phone: string, message: string): Promise<boolean> => {
  try {
    // Format phone number
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    const params: AWS.SNS.PublishInput = {
      PhoneNumber: formattedPhone,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: 'EvecoTrip',
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    };

    const result = await sns.publish(params).promise();

    console.log('✅ SMS sent successfully:', {
      phone: formattedPhone,
      messageId: result.MessageId,
    });

    return true;
  } catch (error: any) {
    console.error('❌ SMS send failed:', error.message);
    throw new Error('SMS_SEND_FAILED');
  }
};

/**
 * Send bulk SMS (for notifications)
 */
export const sendBulkSMS = async (
  phones: string[],
  message: string
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  const promises = phones.map(async (phone) => {
    try {
      await sendSMS(phone, message);
      success++;
    } catch (error) {
      failed++;
    }
  });

  await Promise.allSettled(promises);

  console.log(`✅ Bulk SMS sent: ${success} success, ${failed} failed`);

  return { success, failed };
};

/**
 * Verify phone number format (E.164)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  // E.164 format: +[country code][number]
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

/**
 * Format phone number to E.164
 */
export const formatPhoneNumber = (phone: string, countryCode: string = '91'): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Add country code if not present
  if (!cleaned.startsWith(countryCode)) {
    return `+${countryCode}${cleaned}`;
  }

  return `+${cleaned}`;
};