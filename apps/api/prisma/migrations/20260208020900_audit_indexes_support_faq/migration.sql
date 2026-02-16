-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('PAYMENT_ISSUE', 'DEAL_PROBLEM', 'DISPUTE', 'USER_REPORT', 'CHANNEL_REPORT', 'CHANNEL_VERIFICATION', 'ACCOUNT_ISSUE', 'FEATURE_REQUEST', 'BUG_REPORT', 'QUESTION', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_REQUEST_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_REQUEST_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_PAYMENT_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_CONTENT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_CONTENT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_CONTENT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_DISPUTE_OPENED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_DISPUTE_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_TIMEOUT_WARNING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_REPLY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHANNEL_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHANNEL_VERIFICATION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHANNEL_NEW_ORDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WALLET_DEPOSIT_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WALLET_WITHDRAWAL_SENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WALLET_FUNDS_RELEASED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WALLET_FUNDS_LOCKED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFERRAL_SIGNUP';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFERRAL_BONUS_EARNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TICKET_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TICKET_REPLY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TICKET_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WELCOME';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SYSTEM_ANNOUNCEMENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SECURITY_ALERT';

-- DropIndex (replace single-column with compound)
DROP INDEX IF EXISTS "deals_scheduledPostTime_idx";
DROP INDEX IF EXISTS "transactions_status_idx";
DROP INDEX IF EXISTS "transactions_type_idx";

-- CreateTable
CREATE TABLE IF NOT EXISTS "notification_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "telegramEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dealsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reviewsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "walletEnabled" BOOLEAN NOT NULL DEFAULT true,
    "referralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "marketingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "quietHoursTimezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "dealId" TEXT,
    "channelId" TEXT,
    "reportedUserId" TEXT,
    "assignedTo" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT,
    "isFromSupport" BOOLEAN NOT NULL DEFAULT false,
    "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "faq_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "faq_items" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulYes" INTEGER NOT NULL DEFAULT 0,
    "helpfulNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "notification_settings_userId_key" ON "notification_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_ticketNumber_idx" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_messages_ticketId_createdAt_idx" ON "support_messages"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "faq_categories_slug_key" ON "faq_categories"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "faq_items_categoryId_idx" ON "faq_items"("categoryId");

-- CreateIndex (compound indexes from audit)
CREATE INDEX IF NOT EXISTS "channel_reviews_dealId_idx" ON "channel_reviews"("dealId");

CREATE INDEX IF NOT EXISTS "deals_status_scheduledPostTime_idx" ON "deals"("status", "scheduledPostTime");

CREATE INDEX IF NOT EXISTS "transactions_type_status_createdAt_idx" ON "transactions"("type", "status", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "faq_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
