-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'CHANNEL_OWNER', 'ADVERTISER', 'PR_MANAGER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ChannelCategory" AS ENUM ('CRYPTO', 'TECH', 'BUSINESS', 'ENTERTAINMENT', 'NEWS', 'EDUCATION', 'LIFESTYLE', 'GAMING', 'SPORTS', 'FINANCE', 'HEALTH', 'TRAVEL', 'FOOD', 'FASHION', 'MUSIC', 'ART', 'SCIENCE', 'POLITICS', 'OTHER');

-- CreateEnum
CREATE TYPE "AdFormat" AS ENUM ('POST', 'FORWARD', 'STORY', 'PIN_MESSAGE', 'NATIVE_AD', 'SPONSORED_POST');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('CREATED', 'PENDING_PAYMENT', 'PAYMENT_RECEIVED', 'IN_PROGRESS', 'CREATIVE_PENDING', 'CREATIVE_SUBMITTED', 'CREATIVE_REVISION_REQUESTED', 'CREATIVE_APPROVED', 'SCHEDULED', 'POSTED', 'VERIFYING', 'VERIFIED', 'COMPLETED', 'DISPUTED', 'REFUNDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('PENDING', 'FUNDED', 'LOCKED', 'RELEASING', 'RELEASED', 'REFUNDING', 'REFUNDED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'ESCROW_LOCK', 'ESCROW_RELEASE', 'ESCROW_REFUND', 'PLATFORM_FEE', 'PAYOUT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_ADVERTISER', 'RESOLVED_CHANNEL_OWNER', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('POST_NOT_PUBLISHED', 'POST_DELETED_EARLY', 'POST_MODIFIED', 'WRONG_CONTENT', 'WRONG_TIME', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEAL_CREATED', 'DEAL_UPDATED', 'PAYMENT_RECEIVED', 'CREATIVE_SUBMITTED', 'CREATIVE_APPROVED', 'CREATIVE_REJECTED', 'POST_SCHEDULED', 'POST_PUBLISHED', 'POST_VERIFIED', 'PAYOUT_SENT', 'DISPUTE_OPENED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'DELETED');

-- CreateEnum
CREATE TYPE "CampaignApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CreativeStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'BOT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "telegramUsername" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "photoUrl" TEXT,
    "languageCode" TEXT DEFAULT 'en',
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "roles" "UserRole"[] DEFAULT ARRAY['USER']::"UserRole"[],
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "tonWalletAddress" TEXT,
    "tonWalletConnectedAt" TIMESTAMP(3),
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "totalDeals" INTEGER NOT NULL DEFAULT 0,
    "successfulDeals" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" BIGINT NOT NULL DEFAULT 0,
    "totalEarned" BIGINT NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT,
    "deviceInfo" JSONB,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "publicKey" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "inviteLink" TEXT,
    "photoUrl" TEXT,
    "ownerId" TEXT NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "categories" "ChannelCategory"[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT NOT NULL DEFAULT 'en',
    "country" TEXT,
    "isBotAdded" BOOLEAN NOT NULL DEFAULT false,
    "botAddedAt" TIMESTAMP(3),
    "verificationToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "averageViews" INTEGER NOT NULL DEFAULT 0,
    "averageReach" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "premiumSubscribers" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeals" INTEGER NOT NULL DEFAULT 0,
    "successfulDeals" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" BIGINT NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "autoAcceptDeals" BOOLEAN NOT NULL DEFAULT false,
    "minBudget" BIGINT,
    "maxBudget" BIGINT,
    "statsUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_pricing" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "adFormat" "AdFormat" NOT NULL,
    "price" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TON',
    "description" TEXT,
    "duration" INTEGER,
    "includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minOrderTime" INTEGER,
    "maxOrderTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_stats" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "subscriberGrowth24h" INTEGER NOT NULL DEFAULT 0,
    "subscriberGrowth7d" INTEGER NOT NULL DEFAULT 0,
    "subscriberGrowth30d" INTEGER NOT NULL DEFAULT 0,
    "averageViews" INTEGER NOT NULL DEFAULT 0,
    "averageReach" INTEGER NOT NULL DEFAULT 0,
    "averageViewsGrowth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageReactions" INTEGER NOT NULL DEFAULT 0,
    "averageComments" INTEGER NOT NULL DEFAULT 0,
    "averageShares" INTEGER NOT NULL DEFAULT 0,
    "premiumSubscribers" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "premiumViewsPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "languageDistribution" JSONB,
    "genderDistribution" JSONB,
    "ageDistribution" JSONB,
    "geoDistribution" JSONB,
    "postsLast24h" INTEGER NOT NULL DEFAULT 0,
    "postsLast7d" INTEGER NOT NULL DEFAULT 0,
    "postsLast30d" INTEGER NOT NULL DEFAULT 0,
    "averagePostsPerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "peakHours" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "rawTelegramStats" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastFetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_stats_history" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "subscriberCount" INTEGER NOT NULL,
    "averageViews" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_stats_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_admins" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canManageDeals" BOOLEAN NOT NULL DEFAULT true,
    "canManagePricing" BOOLEAN NOT NULL DEFAULT false,
    "canManageSettings" BOOLEAN NOT NULL DEFAULT false,
    "canWithdraw" BOOLEAN NOT NULL DEFAULT false,
    "canAddAdmins" BOOLEAN NOT NULL DEFAULT false,
    "telegramAdminRights" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "channel_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "brief" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "targetCategories" "ChannelCategory"[],
    "targetLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minSubscribers" INTEGER,
    "maxSubscribers" INTEGER,
    "minEngagement" DOUBLE PRECISION,
    "adFormats" "AdFormat"[],
    "totalBudget" BIGINT NOT NULL,
    "minPricePerPost" BIGINT,
    "maxPricePerPost" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'TON',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "preferredPostTimes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "creativeGuidelines" TEXT,
    "sampleContent" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "doNotInclude" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicationCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "completedDeals" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_applications" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "proposedPrice" BIGINT NOT NULL,
    "adFormat" "AdFormat" NOT NULL,
    "message" TEXT,
    "proposedDate" TIMESTAMP(3),
    "proposedTime" TEXT,
    "status" "CampaignApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "campaign_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "channelOwnerId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "campaignId" TEXT,
    "adFormat" "AdFormat" NOT NULL,
    "price" BIGINT NOT NULL,
    "platformFee" BIGINT NOT NULL,
    "totalAmount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TON',
    "status" "DealStatus" NOT NULL DEFAULT 'CREATED',
    "previousStatus" "DealStatus",
    "brief" TEXT,
    "requirements" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduledPostTime" TIMESTAMP(3),
    "postDuration" INTEGER,
    "creativeDeadline" TIMESTAMP(3),
    "paymentDeadline" TIMESTAMP(3),
    "completionDeadline" TIMESTAMP(3),
    "timeoutMinutes" INTEGER NOT NULL DEFAULT 1440,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "requiresVerification" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_creatives" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "text" TEXT,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "buttons" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersions" JSONB,
    "status" "CreativeStatus" NOT NULL DEFAULT 'DRAFT',
    "advertiserNotes" TEXT,
    "revisionRequests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_timeline" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "fromStatus" "DealStatus",
    "toStatus" "DealStatus",
    "actorId" TEXT,
    "actorType" "ActorType",
    "metadata" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_messages" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrows" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "escrowWalletAddress" TEXT NOT NULL,
    "advertiserWallet" TEXT NOT NULL,
    "channelOwnerWallet" TEXT NOT NULL,
    "platformWallet" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "platformFee" BIGINT NOT NULL,
    "totalAmount" BIGINT NOT NULL,
    "status" "EscrowStatus" NOT NULL DEFAULT 'PENDING',
    "fundingTxHash" TEXT,
    "releaseTxHash" TEXT,
    "refundTxHash" TEXT,
    "fundedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "escrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "escrowId" TEXT,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" BIGINT NOT NULL,
    "fee" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TON',
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "txHash" TEXT,
    "lt" BIGINT,
    "utime" TIMESTAMP(3),
    "description" TEXT,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "requestedRefund" BIGINT,
    "actualRefund" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "published_posts" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "telegramMessageId" INTEGER,
    "content" TEXT,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "buttons" JSONB,
    "status" "PostStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "reactions" INTEGER NOT NULL DEFAULT 0,
    "forwards" INTEGER NOT NULL DEFAULT 0,
    "lastVerifiedAt" TIMESTAMP(3),
    "verificationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "published_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_verifications" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "exists" BOOLEAN NOT NULL,
    "views" INTEGER,
    "reactions" INTEGER,
    "forwards" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "channelId" TEXT,
    "rating" INTEGER NOT NULL,
    "communicationRating" INTEGER,
    "timelinessRating" INTEGER,
    "qualityRating" INTEGER,
    "title" TEXT,
    "comment" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "sentVia" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");

-- CreateIndex
CREATE INDEX "users_telegramId_idx" ON "users"("telegramId");

-- CreateIndex
CREATE INDEX "users_telegramUsername_idx" ON "users"("telegramUsername");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refreshToken_key" ON "user_sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_token_idx" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_address_key" ON "user_wallets"("address");

-- CreateIndex
CREATE INDEX "user_wallets_userId_idx" ON "user_wallets"("userId");

-- CreateIndex
CREATE INDEX "user_wallets_address_idx" ON "user_wallets"("address");

-- CreateIndex
CREATE UNIQUE INDEX "channels_telegramId_key" ON "channels"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "channels_username_key" ON "channels"("username");

-- CreateIndex
CREATE INDEX "channels_telegramId_idx" ON "channels"("telegramId");

-- CreateIndex
CREATE INDEX "channels_username_idx" ON "channels"("username");

-- CreateIndex
CREATE INDEX "channels_ownerId_idx" ON "channels"("ownerId");

-- CreateIndex
CREATE INDEX "channels_status_idx" ON "channels"("status");

-- CreateIndex
CREATE INDEX "channels_categories_idx" ON "channels"("categories");

-- CreateIndex
CREATE INDEX "channels_subscriberCount_idx" ON "channels"("subscriberCount");

-- CreateIndex
CREATE INDEX "channels_rating_idx" ON "channels"("rating");

-- CreateIndex
CREATE INDEX "channel_pricing_channelId_idx" ON "channel_pricing"("channelId");

-- CreateIndex
CREATE INDEX "channel_pricing_adFormat_idx" ON "channel_pricing"("adFormat");

-- CreateIndex
CREATE UNIQUE INDEX "channel_pricing_channelId_adFormat_key" ON "channel_pricing"("channelId", "adFormat");

-- CreateIndex
CREATE UNIQUE INDEX "channel_stats_channelId_key" ON "channel_stats"("channelId");

-- CreateIndex
CREATE INDEX "channel_stats_history_channelId_idx" ON "channel_stats_history"("channelId");

-- CreateIndex
CREATE INDEX "channel_stats_history_recordedAt_idx" ON "channel_stats_history"("recordedAt");

-- CreateIndex
CREATE INDEX "channel_admins_channelId_idx" ON "channel_admins"("channelId");

-- CreateIndex
CREATE INDEX "channel_admins_userId_idx" ON "channel_admins"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "channel_admins_channelId_userId_key" ON "channel_admins"("channelId", "userId");

-- CreateIndex
CREATE INDEX "campaigns_advertiserId_idx" ON "campaigns"("advertiserId");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_targetCategories_idx" ON "campaigns"("targetCategories");

-- CreateIndex
CREATE INDEX "campaigns_createdAt_idx" ON "campaigns"("createdAt");

-- CreateIndex
CREATE INDEX "campaign_applications_campaignId_idx" ON "campaign_applications"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_applications_channelId_idx" ON "campaign_applications"("channelId");

-- CreateIndex
CREATE INDEX "campaign_applications_status_idx" ON "campaign_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_applications_campaignId_channelId_key" ON "campaign_applications"("campaignId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "deals_referenceNumber_key" ON "deals"("referenceNumber");

-- CreateIndex
CREATE INDEX "deals_advertiserId_idx" ON "deals"("advertiserId");

-- CreateIndex
CREATE INDEX "deals_channelOwnerId_idx" ON "deals"("channelOwnerId");

-- CreateIndex
CREATE INDEX "deals_channelId_idx" ON "deals"("channelId");

-- CreateIndex
CREATE INDEX "deals_campaignId_idx" ON "deals"("campaignId");

-- CreateIndex
CREATE INDEX "deals_status_idx" ON "deals"("status");

-- CreateIndex
CREATE INDEX "deals_createdAt_idx" ON "deals"("createdAt");

-- CreateIndex
CREATE INDEX "deals_scheduledPostTime_idx" ON "deals"("scheduledPostTime");

-- CreateIndex
CREATE UNIQUE INDEX "deal_creatives_dealId_key" ON "deal_creatives"("dealId");

-- CreateIndex
CREATE INDEX "deal_timeline_dealId_idx" ON "deal_timeline"("dealId");

-- CreateIndex
CREATE INDEX "deal_timeline_createdAt_idx" ON "deal_timeline"("createdAt");

-- CreateIndex
CREATE INDEX "deal_messages_dealId_idx" ON "deal_messages"("dealId");

-- CreateIndex
CREATE INDEX "deal_messages_senderId_idx" ON "deal_messages"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "escrows_dealId_key" ON "escrows"("dealId");

-- CreateIndex
CREATE INDEX "escrows_dealId_idx" ON "escrows"("dealId");

-- CreateIndex
CREATE INDEX "escrows_status_idx" ON "escrows"("status");

-- CreateIndex
CREATE INDEX "escrows_escrowWalletAddress_idx" ON "escrows"("escrowWalletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_txHash_key" ON "transactions"("txHash");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_escrowId_idx" ON "transactions"("escrowId");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_txHash_idx" ON "transactions"("txHash");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "disputes_dealId_idx" ON "disputes"("dealId");

-- CreateIndex
CREATE INDEX "disputes_initiatorId_idx" ON "disputes"("initiatorId");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "published_posts_dealId_idx" ON "published_posts"("dealId");

-- CreateIndex
CREATE INDEX "published_posts_channelId_idx" ON "published_posts"("channelId");

-- CreateIndex
CREATE INDEX "published_posts_status_idx" ON "published_posts"("status");

-- CreateIndex
CREATE INDEX "published_posts_publishedAt_idx" ON "published_posts"("publishedAt");

-- CreateIndex
CREATE INDEX "published_posts_scheduledFor_idx" ON "published_posts"("scheduledFor");

-- CreateIndex
CREATE INDEX "post_verifications_postId_idx" ON "post_verifications"("postId");

-- CreateIndex
CREATE INDEX "post_verifications_createdAt_idx" ON "post_verifications"("createdAt");

-- CreateIndex
CREATE INDEX "reviews_recipientId_idx" ON "reviews"("recipientId");

-- CreateIndex
CREATE INDEX "reviews_channelId_idx" ON "reviews"("channelId");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_dealId_authorId_key" ON "reviews"("dealId", "authorId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_pricing" ADD CONSTRAINT "channel_pricing_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_stats" ADD CONSTRAINT "channel_stats_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_stats_history" ADD CONSTRAINT "channel_stats_history_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_admins" ADD CONSTRAINT "channel_admins_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_admins" ADD CONSTRAINT "channel_admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_applications" ADD CONSTRAINT "campaign_applications_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_applications" ADD CONSTRAINT "campaign_applications_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_applications" ADD CONSTRAINT "campaign_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_channelOwnerId_fkey" FOREIGN KEY ("channelOwnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_creatives" ADD CONSTRAINT "deal_creatives_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_timeline" ADD CONSTRAINT "deal_timeline_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_timeline" ADD CONSTRAINT "deal_timeline_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_messages" ADD CONSTRAINT "deal_messages_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_messages" ADD CONSTRAINT "deal_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "escrows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_verifications" ADD CONSTRAINT "post_verifications_postId_fkey" FOREIGN KEY ("postId") REFERENCES "published_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
