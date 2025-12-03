-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('SIGNUP', 'LOGIN', 'RESET_PASSWORD', 'PHONE_VERIFICATION', 'TWO_FACTOR_AUTH');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('RIDER', 'DRIVER', 'FLEET_OWNER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILURE', 'WARNING');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('EV', 'PETROL');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "DriverVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LICENSE', 'AADHAR', 'PAN', 'PHOTO');

-- CreateEnum
CREATE TYPE "VehicleDocumentType" AS ENUM ('RC_BOOK', 'INSURANCE', 'POLLUTION_CERT', 'VEHICLE_PHOTO_FRONT', 'VEHICLE_PHOTO_BACK', 'VEHICLE_PHOTO_SIDE');

-- CreateEnum
CREATE TYPE "FleetDocumentType" AS ENUM ('GST_CERTIFICATE', 'PAN_CARD', 'COMPANY_REGISTRATION', 'BANK_STATEMENT');

-- CreateEnum
CREATE TYPE "RideType" AS ENUM ('INSTANT', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('REQUESTED', 'MATCHED', 'ACCEPTED', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CancellationBy" AS ENUM ('RIDER', 'DRIVER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('UPI', 'CARD', 'WALLET', 'NET_BANKING', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WalletUserType" AS ENUM ('RIDER', 'DRIVER');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "WithdrawalUserType" AS ENUM ('DRIVER', 'FLEET_OWNER');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PUSH', 'SMS', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "DriverEarningModel" AS ENUM ('TIME_SUBSCRIPTION', 'PREPAID_CREDIT', 'COMMISSION');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SUBSCRIPTION_PURCHASE', 'CREDIT_PURCHASE', 'CREDIT_RECHARGE', 'AUTO_RENEWAL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "email" VARCHAR(255),
    "password_hash" VARCHAR(255),
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "profile_photo_url" TEXT,
    "date_of_birth" DATE,
    "gender" "Gender",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspended_at" TIMESTAMPTZ(6),
    "suspend_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_login_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "device_id" VARCHAR(255),
    "device_type" VARCHAR(50),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by" UUID,
    "device_id" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "phone" VARCHAR(15) NOT NULL,
    "otp_code" VARCHAR(6) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" "RoleType" NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(100),
    "resource_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "status" "AuditStatus" NOT NULL,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "address_type" "AddressType" NOT NULL DEFAULT 'OTHER',
    "label" VARCHAR(100),
    "address_line_1" VARCHAR(500) NOT NULL,
    "address_line_2" VARCHAR(500),
    "landmark" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "zip_code" VARCHAR(20) NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_saved" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_locations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "pickup_id" UUID,
    "dropoff_id" UUID,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "favorite_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "total_rides" INTEGER NOT NULL DEFAULT 0,
    "completed_rides" INTEGER NOT NULL DEFAULT 0,
    "cancelled_rides" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "preferred_vehicle_type" "VehicleType",
    "prefer_ev" BOOLEAN NOT NULL DEFAULT true,
    "accept_petrol" BOOLEAN NOT NULL DEFAULT true,
    "max_wait_time" INTEGER NOT NULL DEFAULT 10,
    "emergency_contact_name" VARCHAR(100),
    "emergency_contact_phone" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspended_at" TIMESTAMPTZ(6),
    "suspend_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "riders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" UUID NOT NULL,
    "rider_id" UUID NOT NULL,
    "method_type" "PaymentMethodType" NOT NULL,
    "card_last_4" VARCHAR(4),
    "card_brand" VARCHAR(50),
    "card_expiry_month" INTEGER,
    "card_expiry_year" INTEGER,
    "upi_id" VARCHAR(100),
    "razorpay_customer_id" VARCHAR(255),
    "razorpay_token_id" VARCHAR(255),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "nickname" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "license_number" VARCHAR(50) NOT NULL,
    "license_expiry" DATE NOT NULL,
    "license_state" VARCHAR(100),
    "fleet_owner_id" UUID,
    "status" "DriverStatus" NOT NULL DEFAULT 'OFFLINE',
    "verification_status" "DriverVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "current_lat" DECIMAL(10,8),
    "current_lng" DECIMAL(11,8),
    "heading" DECIMAL(5,2),
    "last_location_update" TIMESTAMPTZ(6),
    "total_rides" INTEGER NOT NULL DEFAULT 0,
    "completed_rides" INTEGER NOT NULL DEFAULT 0,
    "cancelled_rides" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "total_earnings" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "route_preference_active" BOOLEAN NOT NULL DEFAULT false,
    "route_preference_start_lat" DECIMAL(10,8),
    "route_preference_start_lng" DECIMAL(11,8),
    "route_preference_end_lat" DECIMAL(10,8),
    "route_preference_end_lng" DECIMAL(11,8),
    "route_preference_corridor_km" DECIMAL(5,2) DEFAULT 2.0,
    "route_preference_activated_at" TIMESTAMPTZ(6),
    "route_preference_expires_at" TIMESTAMPTZ(6),
    "bank_account_number" VARCHAR(50),
    "bank_ifsc_code" VARCHAR(11),
    "bank_account_name" VARCHAR(255),
    "upi_id" VARCHAR(100),
    "verified_at" TIMESTAMPTZ(6),
    "verified_by" UUID,
    "rejected_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspended_at" TIMESTAMPTZ(6),
    "suspend_reason" TEXT,
    "can_accept_cash_rides" BOOLEAN NOT NULL DEFAULT true,
    "last_wallet_check_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_subscriptions" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "model_type" "DriverEarningModel" NOT NULL,
    "plan_type" "SubscriptionPlan",
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),
    "amount" DECIMAL(10,2) NOT NULL,
    "credit_balance" DECIMAL(10,2) DEFAULT 0,
    "credit_purchased" DECIMAL(10,2),
    "credit_bonus" DECIMAL(10,2),
    "commission_rate" DECIMAL(5,2),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_transactions" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "credit_amount" DECIMAL(10,2),
    "payment_method" "PaymentMethodType" NOT NULL,
    "payment_id" VARCHAR(255),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_usage" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "ride_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "ride_fare" DECIMAL(10,2) NOT NULL,
    "credit_used" DECIMAL(10,2) NOT NULL,
    "balance_before" DECIMAL(10,2) NOT NULL,
    "balance_after" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "registration_number" VARCHAR(20) NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "make" VARCHAR(50) NOT NULL,
    "model" VARCHAR(50) NOT NULL,
    "year" INTEGER NOT NULL,
    "color" VARCHAR(30) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "is_company_owned" BOOLEAN NOT NULL DEFAULT false,
    "insurance_number" VARCHAR(50),
    "insurance_expiry" DATE,
    "pollution_cert_number" VARCHAR(50),
    "pollution_cert_expiry" DATE,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "verified_by" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_documents" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_url" VARCHAR(500) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "verified_by" UUID,
    "is_rejected" BOOLEAN NOT NULL DEFAULT false,
    "rejected_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "document_type" "VehicleDocumentType" NOT NULL,
    "document_url" VARCHAR(500) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "verified_by" UUID,
    "is_rejected" BOOLEAN NOT NULL DEFAULT false,
    "rejected_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_owners" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "gst_number" VARCHAR(15),
    "pan_number" VARCHAR(10),
    "total_drivers" INTEGER NOT NULL DEFAULT 0,
    "total_vehicles" INTEGER NOT NULL DEFAULT 0,
    "total_rides" INTEGER NOT NULL DEFAULT 0,
    "total_earnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 20.0,
    "bank_account_number" VARCHAR(50),
    "bank_ifsc_code" VARCHAR(11),
    "bank_account_name" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "fleet_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_documents" (
    "id" UUID NOT NULL,
    "fleet_owner_id" UUID NOT NULL,
    "document_type" "FleetDocumentType" NOT NULL,
    "document_url" VARCHAR(500) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "verified_by" UUID,
    "is_rejected" BOOLEAN NOT NULL DEFAULT false,
    "rejected_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "fleet_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rides" (
    "id" UUID NOT NULL,
    "rider_id" UUID NOT NULL,
    "driver_id" UUID,
    "vehicle_id" UUID,
    "ride_type" "RideType" NOT NULL DEFAULT 'INSTANT',
    "vehicle_type" "VehicleType" NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'REQUESTED',
    "pickup_address_id" UUID,
    "pickup_lat" DECIMAL(10,8) NOT NULL,
    "pickup_lng" DECIMAL(11,8) NOT NULL,
    "pickup_address" TEXT,
    "dropoff_address_id" UUID,
    "dropoff_lat" DECIMAL(10,8) NOT NULL,
    "dropoff_lng" DECIMAL(11,8) NOT NULL,
    "dropoff_address" TEXT,
    "estimated_fare" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "base_fare" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "distance_charge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "time_charge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "surge_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "surge_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "schedule_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "final_fare" DECIMAL(10,2),
    "platform_commission" DECIMAL(10,2),
    "driver_earnings" DECIMAL(10,2),
    "distance_km" DECIMAL(10,2),
    "duration_minutes" INTEGER,
    "scheduled_at" TIMESTAMPTZ(6),
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matched_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by" "CancellationBy",
    "cancellation_reason" TEXT,
    "cancellation_fee" DECIMAL(10,2),
    "payment_method" "PaymentMethodType" NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "ride_id" UUID NOT NULL,
    "cash_collected" DECIMAL(10,2) NOT NULL,
    "commission_deducted" DECIMAL(10,2) NOT NULL,
    "wallet_balance_before" DECIMAL(10,2) NOT NULL,
    "wallet_balance_after" DECIMAL(10,2) NOT NULL,
    "commission_source" VARCHAR(50) NOT NULL DEFAULT 'WALLET_DEDUCTION',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "verified_by" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_status_history" (
    "id" UUID NOT NULL,
    "ride_id" UUID NOT NULL,
    "from_status" "RideStatus",
    "to_status" "RideStatus" NOT NULL,
    "changed_by" UUID,
    "reason" TEXT,
    "metadata" JSONB,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL,
    "ride_id" UUID NOT NULL,
    "rider_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "rider_rating" INTEGER,
    "driver_rating" INTEGER,
    "rider_feedback" TEXT,
    "driver_feedback" TEXT,
    "rider_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "driver_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "ride_id" UUID NOT NULL,
    "rider_id" UUID NOT NULL,
    "driver_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "payment_method" "PaymentMethodType" NOT NULL,
    "payment_method_id" UUID,
    "razorpay_order_id" VARCHAR(255),
    "razorpay_payment_id" VARCHAR(255),
    "razorpay_signature" VARCHAR(255),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failure_reason" TEXT,
    "platform_commission" DECIMAL(10,2) NOT NULL,
    "driver_earnings" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "razorpay_refund_id" VARCHAR(255),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_type" "WalletUserType" NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balance_before" DECIMAL(10,2) NOT NULL,
    "balance_after" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "ride_id" UUID,
    "payment_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earnings" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "ride_id" UUID NOT NULL,
    "gross_amount" DECIMAL(10,2) NOT NULL,
    "platform_commission" DECIMAL(10,2) NOT NULL,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_type" "WithdrawalUserType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "bank_account_number" VARCHAR(50) NOT NULL,
    "bank_ifsc_code" VARCHAR(11) NOT NULL,
    "utr_number" VARCHAR(50),
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "failure_reason" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_phone" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_active" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "idx_users_verified" ON "users"("is_verified");

-- CreateIndex
CREATE INDEX "idx_users_created_at" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_sessions_token" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "idx_sessions_active" ON "sessions"("is_active");

-- CreateIndex
CREATE INDEX "idx_sessions_expires_at" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_sessions_user_active" ON "sessions"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_token" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_revoked" ON "refresh_tokens"("is_revoked");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_otp_verifications_phone" ON "otp_verifications"("phone");

-- CreateIndex
CREATE INDEX "idx_otp_verifications_phone_purpose" ON "otp_verifications"("phone", "purpose");

-- CreateIndex
CREATE INDEX "idx_otp_verifications_verified" ON "otp_verifications"("is_verified");

-- CreateIndex
CREATE INDEX "idx_otp_verifications_expires_at" ON "otp_verifications"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "idx_roles_name" ON "roles"("name");

-- CreateIndex
CREATE INDEX "idx_roles_active" ON "roles"("is_active");

-- CreateIndex
CREATE INDEX "idx_user_roles_user_id" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_role_id" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_resource" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_status" ON "audit_logs"("status");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_addresses_user_id" ON "addresses"("user_id");

-- CreateIndex
CREATE INDEX "idx_addresses_user_default" ON "addresses"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "idx_addresses_type" ON "addresses"("address_type");

-- CreateIndex
CREATE INDEX "idx_addresses_location" ON "addresses"("city", "state");

-- CreateIndex
CREATE INDEX "idx_addresses_geo" ON "addresses"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "idx_favorite_locations_user_id" ON "favorite_locations"("user_id");

-- CreateIndex
CREATE INDEX "idx_favorite_locations_user_name" ON "favorite_locations"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "riders_user_id_key" ON "riders"("user_id");

-- CreateIndex
CREATE INDEX "idx_riders_user_id" ON "riders"("user_id");

-- CreateIndex
CREATE INDEX "idx_riders_active" ON "riders"("is_active");

-- CreateIndex
CREATE INDEX "idx_riders_verified" ON "riders"("is_verified");

-- CreateIndex
CREATE INDEX "idx_riders_created_at" ON "riders"("created_at");

-- CreateIndex
CREATE INDEX "idx_payment_methods_rider_id" ON "payment_methods"("rider_id");

-- CreateIndex
CREATE INDEX "idx_payment_methods_rider_default" ON "payment_methods"("rider_id", "is_default");

-- CreateIndex
CREATE INDEX "idx_payment_methods_type" ON "payment_methods"("method_type");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_license_number_key" ON "drivers"("license_number");

-- CreateIndex
CREATE INDEX "idx_drivers_user_id" ON "drivers"("user_id");

-- CreateIndex
CREATE INDEX "idx_drivers_license" ON "drivers"("license_number");

-- CreateIndex
CREATE INDEX "idx_drivers_fleet_owner" ON "drivers"("fleet_owner_id");

-- CreateIndex
CREATE INDEX "idx_drivers_status" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "idx_drivers_verification" ON "drivers"("verification_status");

-- CreateIndex
CREATE INDEX "idx_drivers_active" ON "drivers"("is_active");

-- CreateIndex
CREATE INDEX "idx_drivers_online" ON "drivers"("is_online");

-- CreateIndex
CREATE INDEX "idx_drivers_available" ON "drivers"("is_available");

-- CreateIndex
CREATE INDEX "idx_drivers_location" ON "drivers"("current_lat", "current_lng");

-- CreateIndex
CREATE INDEX "idx_drivers_route_preference" ON "drivers"("route_preference_active");

-- CreateIndex
CREATE INDEX "idx_drivers_cash_rides" ON "drivers"("can_accept_cash_rides");

-- CreateIndex
CREATE INDEX "idx_drivers_created_at" ON "drivers"("created_at");

-- CreateIndex
CREATE INDEX "idx_driver_subscriptions_driver_id" ON "driver_subscriptions"("driver_id");

-- CreateIndex
CREATE INDEX "idx_driver_subscriptions_model_type" ON "driver_subscriptions"("model_type");

-- CreateIndex
CREATE INDEX "idx_driver_subscriptions_status" ON "driver_subscriptions"("status");

-- CreateIndex
CREATE INDEX "idx_driver_subscriptions_end_date" ON "driver_subscriptions"("end_date");

-- CreateIndex
CREATE INDEX "idx_driver_subscriptions_driver_status" ON "driver_subscriptions"("driver_id", "status");

-- CreateIndex
CREATE INDEX "idx_subscription_transactions_subscription_id" ON "subscription_transactions"("subscription_id");

-- CreateIndex
CREATE INDEX "idx_subscription_transactions_driver_id" ON "subscription_transactions"("driver_id");

-- CreateIndex
CREATE INDEX "idx_subscription_transactions_type" ON "subscription_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "idx_subscription_transactions_status" ON "subscription_transactions"("status");

-- CreateIndex
CREATE INDEX "idx_subscription_transactions_created_at" ON "subscription_transactions"("created_at");

-- CreateIndex
CREATE INDEX "idx_credit_usage_subscription_id" ON "credit_usage"("subscription_id");

-- CreateIndex
CREATE INDEX "idx_credit_usage_ride_id" ON "credit_usage"("ride_id");

-- CreateIndex
CREATE INDEX "idx_credit_usage_driver_id" ON "credit_usage"("driver_id");

-- CreateIndex
CREATE INDEX "idx_credit_usage_created_at" ON "credit_usage"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_driver_id_key" ON "vehicles"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_number_key" ON "vehicles"("registration_number");

-- CreateIndex
CREATE INDEX "idx_vehicles_driver_id" ON "vehicles"("driver_id");

-- CreateIndex
CREATE INDEX "idx_vehicles_registration" ON "vehicles"("registration_number");

-- CreateIndex
CREATE INDEX "idx_vehicles_type" ON "vehicles"("vehicle_type");

-- CreateIndex
CREATE INDEX "idx_vehicles_company_owned" ON "vehicles"("is_company_owned");

-- CreateIndex
CREATE INDEX "idx_vehicles_verified" ON "vehicles"("is_verified");

-- CreateIndex
CREATE INDEX "idx_driver_documents_driver_id" ON "driver_documents"("driver_id");

-- CreateIndex
CREATE INDEX "idx_driver_documents_type" ON "driver_documents"("document_type");

-- CreateIndex
CREATE INDEX "idx_driver_documents_verified" ON "driver_documents"("is_verified");

-- CreateIndex
CREATE INDEX "idx_vehicle_documents_vehicle_id" ON "vehicle_documents"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_vehicle_documents_type" ON "vehicle_documents"("document_type");

-- CreateIndex
CREATE INDEX "idx_vehicle_documents_verified" ON "vehicle_documents"("is_verified");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_owners_user_id_key" ON "fleet_owners"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_owners_gst_number_key" ON "fleet_owners"("gst_number");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_owners_pan_number_key" ON "fleet_owners"("pan_number");

-- CreateIndex
CREATE INDEX "idx_fleet_owners_user_id" ON "fleet_owners"("user_id");

-- CreateIndex
CREATE INDEX "idx_fleet_owners_gst" ON "fleet_owners"("gst_number");

-- CreateIndex
CREATE INDEX "idx_fleet_owners_active" ON "fleet_owners"("is_active");

-- CreateIndex
CREATE INDEX "idx_fleet_owners_verified" ON "fleet_owners"("is_verified");

-- CreateIndex
CREATE INDEX "idx_fleet_documents_owner_id" ON "fleet_documents"("fleet_owner_id");

-- CreateIndex
CREATE INDEX "idx_fleet_documents_type" ON "fleet_documents"("document_type");

-- CreateIndex
CREATE INDEX "idx_fleet_documents_verified" ON "fleet_documents"("is_verified");

-- CreateIndex
CREATE INDEX "idx_rides_rider_id" ON "rides"("rider_id");

-- CreateIndex
CREATE INDEX "idx_rides_driver_id" ON "rides"("driver_id");

-- CreateIndex
CREATE INDEX "idx_rides_vehicle_id" ON "rides"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_rides_status" ON "rides"("status");

-- CreateIndex
CREATE INDEX "idx_rides_type" ON "rides"("ride_type");

-- CreateIndex
CREATE INDEX "idx_rides_vehicle_type" ON "rides"("vehicle_type");

-- CreateIndex
CREATE INDEX "idx_rides_scheduled_at" ON "rides"("scheduled_at");

-- CreateIndex
CREATE INDEX "idx_rides_requested_at" ON "rides"("requested_at");

-- CreateIndex
CREATE INDEX "idx_rides_completed_at" ON "rides"("completed_at");

-- CreateIndex
CREATE INDEX "idx_rides_rider_status" ON "rides"("rider_id", "status");

-- CreateIndex
CREATE INDEX "idx_rides_driver_status" ON "rides"("driver_id", "status");

-- CreateIndex
CREATE INDEX "idx_rides_pickup_location" ON "rides"("pickup_lat", "pickup_lng");

-- CreateIndex
CREATE INDEX "idx_rides_dropoff_location" ON "rides"("dropoff_lat", "dropoff_lng");

-- CreateIndex
CREATE INDEX "idx_rides_payment_method" ON "rides"("payment_method");

-- CreateIndex
CREATE INDEX "idx_cash_transactions_driver_id" ON "cash_transactions"("driver_id");

-- CreateIndex
CREATE INDEX "idx_cash_transactions_ride_id" ON "cash_transactions"("ride_id");

-- CreateIndex
CREATE INDEX "idx_cash_transactions_created_at" ON "cash_transactions"("created_at");

-- CreateIndex
CREATE INDEX "idx_cash_transactions_driver_date" ON "cash_transactions"("driver_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_ride_status_history_ride_id" ON "ride_status_history"("ride_id");

-- CreateIndex
CREATE INDEX "idx_ride_status_history_ride_time" ON "ride_status_history"("ride_id", "changed_at");

-- CreateIndex
CREATE INDEX "idx_ride_status_history_to_status" ON "ride_status_history"("to_status");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_ride_id_key" ON "ratings"("ride_id");

-- CreateIndex
CREATE INDEX "idx_ratings_ride_id" ON "ratings"("ride_id");

-- CreateIndex
CREATE INDEX "idx_ratings_rider_id" ON "ratings"("rider_id");

-- CreateIndex
CREATE INDEX "idx_ratings_driver_id" ON "ratings"("driver_id");

-- CreateIndex
CREATE INDEX "idx_ratings_driver_rating" ON "ratings"("driver_rating");

-- CreateIndex
CREATE INDEX "idx_ratings_created_at" ON "ratings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_ride_id_key" ON "payments"("ride_id");

-- CreateIndex
CREATE INDEX "idx_payments_ride_id" ON "payments"("ride_id");

-- CreateIndex
CREATE INDEX "idx_payments_rider_id" ON "payments"("rider_id");

-- CreateIndex
CREATE INDEX "idx_payments_driver_id" ON "payments"("driver_id");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE INDEX "idx_payments_razorpay_id" ON "payments"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "idx_payments_created_at" ON "payments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_payment_id_key" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "idx_refunds_payment_id" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "idx_refunds_status" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "idx_refunds_razorpay_id" ON "refunds"("razorpay_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "idx_wallets_user_id" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "idx_wallets_user_type" ON "wallets"("user_type");

-- CreateIndex
CREATE INDEX "idx_wallets_status" ON "wallets"("status");

-- CreateIndex
CREATE INDEX "idx_wallet_transactions_wallet_id" ON "wallet_transactions"("wallet_id");

-- CreateIndex
CREATE INDEX "idx_wallet_transactions_type" ON "wallet_transactions"("type");

-- CreateIndex
CREATE INDEX "idx_wallet_transactions_ride_id" ON "wallet_transactions"("ride_id");

-- CreateIndex
CREATE INDEX "idx_wallet_transactions_created_at" ON "wallet_transactions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "earnings_ride_id_key" ON "earnings"("ride_id");

-- CreateIndex
CREATE INDEX "idx_earnings_driver_id" ON "earnings"("driver_id");

-- CreateIndex
CREATE INDEX "idx_earnings_ride_id" ON "earnings"("ride_id");

-- CreateIndex
CREATE INDEX "idx_earnings_paid" ON "earnings"("is_paid");

-- CreateIndex
CREATE INDEX "idx_earnings_driver_paid" ON "earnings"("driver_id", "is_paid");

-- CreateIndex
CREATE INDEX "idx_earnings_created_at" ON "earnings"("created_at");

-- CreateIndex
CREATE INDEX "idx_withdrawals_user_id" ON "withdrawals"("user_id");

-- CreateIndex
CREATE INDEX "idx_withdrawals_user_type" ON "withdrawals"("user_type");

-- CreateIndex
CREATE INDEX "idx_withdrawals_status" ON "withdrawals"("status");

-- CreateIndex
CREATE INDEX "idx_withdrawals_requested_at" ON "withdrawals"("requested_at");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_notifications_type" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "idx_notifications_status" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "idx_notifications_user_status" ON "notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "address_rider_fkey" FOREIGN KEY ("user_id") REFERENCES "riders"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "address_driver_fkey" FOREIGN KEY ("user_id") REFERENCES "drivers"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_locations" ADD CONSTRAINT "favorite_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "riders"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_locations" ADD CONSTRAINT "favorite_locations_pickup_id_fkey" FOREIGN KEY ("pickup_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_locations" ADD CONSTRAINT "favorite_locations_dropoff_id_fkey" FOREIGN KEY ("dropoff_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riders" ADD CONSTRAINT "riders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_fleet_owner_id_fkey" FOREIGN KEY ("fleet_owner_id") REFERENCES "fleet_owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_subscriptions" ADD CONSTRAINT "driver_subscriptions_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_transactions" ADD CONSTRAINT "subscription_transactions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "driver_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_usage" ADD CONSTRAINT "credit_usage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "driver_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_usage" ADD CONSTRAINT "credit_usage_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_owners" ADD CONSTRAINT "fleet_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_documents" ADD CONSTRAINT "fleet_documents_fleet_owner_id_fkey" FOREIGN KEY ("fleet_owner_id") REFERENCES "fleet_owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_pickup_address_id_fkey" FOREIGN KEY ("pickup_address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_dropoff_address_id_fkey" FOREIGN KEY ("dropoff_address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_status_history" ADD CONSTRAINT "ride_status_history_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallet_rider_fkey" FOREIGN KEY ("user_id") REFERENCES "riders"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallet_driver_fkey" FOREIGN KEY ("user_id") REFERENCES "drivers"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawal_driver_fkey" FOREIGN KEY ("user_id") REFERENCES "drivers"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawal_fleet_owner_fkey" FOREIGN KEY ("user_id") REFERENCES "fleet_owners"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
