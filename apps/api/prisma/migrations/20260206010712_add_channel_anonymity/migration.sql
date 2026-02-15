-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "adRequirements" TEXT,
ADD COLUMN     "isAcceptingOrders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isOwnerAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "deal_creatives" ADD COLUMN     "sourceChatId" BIGINT,
ADD COLUMN     "sourceMessageId" INTEGER;

-- AlterTable
ALTER TABLE "escrows" ADD COLUMN     "metadata" JSONB;
