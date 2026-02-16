/*
  Warnings:

  - You are about to drop the column `title` on the `reviews` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('PAYMENT_ISSUE', 'DEAL_PROBLEM', 'DISPUTE', 'USER_REPORT', 'CHANNEL_REPORT', 'CHANNEL_VERIFICATION', 'ACCOUNT_ISSUE', 'FEATURE_REQUEST', 'BUG_REPORT', 'QUESTION', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DEAL_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_REQUEST_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_REQUEST_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_PAYMENT_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_CONTENT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_CONTENT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_CONTENT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_DISPUTE_OPENED';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_DISPUTE_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_TIMEOUT_WARNING';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'CHANNEL_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE 'CHANNEL_VERIFICATION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'CHANNEL_NEW_ORDER';
ALTER TYPE "NotificationType" ADD VALUE 'WALLET_DEPOSIT_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'WALLET_WITHDRAWAL_SENT';
ALTER TYPE "NotificationType" ADD VALUE 'WALLET_FUNDS_RELEASED';
ALTER TYPE "NotificationType" ADD VALUE 'WALLET_FUNDS_LOCKED';
ALTER TYPE "NotificationType" ADD VALUE 'REFERRAL_SIGNUP';
ALTER TYPE "NotificationType" ADD VALUE 'REFERRAL_BONUS_EARNED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE 'WELCOME';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM_ANNOUNCEMENT';
ALTER TYPE "NotificationType" ADD VALUE 'SECURITY_ALERT';

-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "channelRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "channelReviewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "contentSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "title",
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "channel_reviews" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "audienceQuality" INTEGER,
    "engagementRating" INTEGER,
    "reachAccuracy" INTEGER,
    "comment" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
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
CREATE TABLE "support_tickets" (
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
CREATE TABLE "support_messages" (
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
CREATE TABLE "faq_categories" (
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
CREATE TABLE "faq_items" (
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
CREATE INDEX "channel_reviews_channelId_idx" ON "channel_reviews"("channelId");

-- CreateIndex
CREATE INDEX "channel_reviews_overallRating_idx" ON "channel_reviews"("overallRating");

-- CreateIndex
CREATE UNIQUE INDEX "channel_reviews_dealId_fromUserId_key" ON "channel_reviews"("dealId", "fromUserId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_userId_key" ON "notification_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_ticketNumber_idx" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "support_messages_ticketId_createdAt_idx" ON "support_messages"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "faq_categories_slug_key" ON "faq_categories"("slug");

-- CreateIndex
CREATE INDEX "faq_items_categoryId_idx" ON "faq_items"("categoryId");

-- AddForeignKey
ALTER TABLE "channel_reviews" ADD CONSTRAINT "channel_reviews_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_reviews" ADD CONSTRAINT "channel_reviews_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_reviews" ADD CONSTRAINT "channel_reviews_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "faq_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
