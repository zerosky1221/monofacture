/**
 * Script to recalculate all user and channel statistics from actual deals
 * Run with: npx ts-node prisma/recalculate-stats.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculateUserStats(userId: string): Promise<void> {
  // Calculate deals as advertiser
  const advertiserStats = await prisma.deal.aggregate({
    where: { advertiserId: userId },
    _count: { id: true },
  });

  const advertiserCompleted = await prisma.deal.aggregate({
    where: { advertiserId: userId, status: 'COMPLETED' },
    _count: { id: true },
    _sum: { totalAmount: true },
  });

  // Calculate deals as publisher
  const publisherStats = await prisma.deal.aggregate({
    where: { channelOwnerId: userId },
    _count: { id: true },
  });

  const publisherCompleted = await prisma.deal.aggregate({
    where: { channelOwnerId: userId, status: 'COMPLETED' },
    _count: { id: true },
    _sum: { price: true },
  });

  // Total deals = as advertiser + as publisher
  const totalDeals = advertiserStats._count.id + publisherStats._count.id;
  const successfulDeals = advertiserCompleted._count.id + publisherCompleted._count.id;
  const totalSpent = advertiserCompleted._sum.totalAmount || BigInt(0);
  const totalEarned = publisherCompleted._sum.price || BigInt(0);

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalDeals,
      successfulDeals,
      totalSpent,
      totalEarned,
    },
  });
}

async function recalculateChannelStats(channelId: string): Promise<void> {
  const totalDealsCount = await prisma.deal.count({
    where: { channelId },
  });

  const completedStats = await prisma.deal.aggregate({
    where: { channelId, status: 'COMPLETED' },
    _count: { id: true },
    _sum: { price: true },
  });

  await prisma.channel.update({
    where: { id: channelId },
    data: {
      totalDeals: totalDealsCount,
      successfulDeals: completedStats._count.id,
      totalEarnings: completedStats._sum.price || BigInt(0),
    },
  });
}

async function main() {
  console.log('🔄 Starting statistics recalculation...\n');

  // Recalculate user stats
  const users = await prisma.user.findMany({ select: { id: true, firstName: true } });
  console.log(`📊 Recalculating stats for ${users.length} users...`);
  
  let userUpdated = 0;
  for (const user of users) {
    try {
      await recalculateUserStats(user.id);
      userUpdated++;
      process.stdout.write(`\r  Progress: ${userUpdated}/${users.length}`);
    } catch (error) {
      console.error(`\n  ❌ Error for user ${user.id}: ${(error as Error).message}`);
    }
  }
  console.log(`\n  ✅ Updated ${userUpdated} users\n`);

  // Recalculate channel stats
  const channels = await prisma.channel.findMany({ select: { id: true, title: true } });
  console.log(`📺 Recalculating stats for ${channels.length} channels...`);
  
  let channelUpdated = 0;
  for (const channel of channels) {
    try {
      await recalculateChannelStats(channel.id);
      channelUpdated++;
      process.stdout.write(`\r  Progress: ${channelUpdated}/${channels.length}`);
    } catch (error) {
      console.error(`\n  ❌ Error for channel ${channel.id}: ${(error as Error).message}`);
    }
  }
  console.log(`\n  ✅ Updated ${channelUpdated} channels\n`);

  // Show summary
  console.log('═══════════════════════════════════════════');
  console.log('📈 Recalculation Complete!');
  console.log(`   Users updated: ${userUpdated}`);
  console.log(`   Channels updated: ${channelUpdated}`);
  console.log('═══════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
