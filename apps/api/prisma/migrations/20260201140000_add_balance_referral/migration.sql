-- CreateEnum
CREATE TYPE "BalanceTransactionType" AS ENUM ('DEAL_EARNING', 'REFERRAL_EARNING', 'WITHDRAWAL', 'WITHDRAWAL_FEE', 'REFUND_CREDIT', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "user_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "available" BIGINT NOT NULL DEFAULT 0,
    "pending" BIGINT NOT NULL DEFAULT 0,
    "totalEarned" BIGINT NOT NULL DEFAULT 0,
    "totalWithdrawn" BIGINT NOT NULL DEFAULT 0,
    "totalReferral" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_transactions" (
    "id" TEXT NOT NULL,
    "balanceId" TEXT NOT NULL,
    "type" "BalanceTransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "description" TEXT,
    "dealId" TEXT,
    "referralId" TEXT,
    "withdrawalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balanceId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "fee" BIGINT NOT NULL DEFAULT 0,
    "netAmount" BIGINT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalEarned" BIGINT NOT NULL DEFAULT 0,
    "dealCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_earnings" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "dealAmount" BIGINT NOT NULL,
    "platformFee" BIGINT NOT NULL,
    "earning" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_earnings_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add referralCode to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_balances_userId_key" ON "user_balances"("userId");
CREATE INDEX "balance_transactions_balanceId_idx" ON "balance_transactions"("balanceId");
CREATE INDEX "balance_transactions_type_idx" ON "balance_transactions"("type");
CREATE INDEX "balance_transactions_dealId_idx" ON "balance_transactions"("dealId");
CREATE INDEX "balance_transactions_createdAt_idx" ON "balance_transactions"("createdAt");
CREATE INDEX "withdrawals_userId_idx" ON "withdrawals"("userId");
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");
CREATE INDEX "withdrawals_createdAt_idx" ON "withdrawals"("createdAt");
CREATE UNIQUE INDEX "referrals_referredUserId_key" ON "referrals"("referredUserId");
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");
CREATE INDEX "referrals_referredUserId_idx" ON "referrals"("referredUserId");
CREATE INDEX "referrals_referralCode_idx" ON "referrals"("referralCode");
CREATE INDEX "referral_earnings_referralId_idx" ON "referral_earnings"("referralId");
CREATE INDEX "referral_earnings_dealId_idx" ON "referral_earnings"("dealId");
CREATE INDEX "referral_earnings_createdAt_idx" ON "referral_earnings"("createdAt");
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- AddForeignKey
ALTER TABLE "user_balances" ADD CONSTRAINT "user_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "user_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "user_balances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
