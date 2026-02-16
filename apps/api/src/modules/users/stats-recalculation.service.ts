import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class StatsRecalculationService {
  private readonly logger = new Logger(StatsRecalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recalculateAllUserStats(): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    const users = await this.prisma.user.findMany({
      select: { id: true },
    });

    for (const user of users) {
      try {
        await this.recalculateUserStats(user.id);
        updated++;
      } catch (error) {
        errors.push(`User ${user.id}: ${(error as Error).message}`);
      }
    }

    this.logger.log(`Recalculated stats for ${updated} users, ${errors.length} errors`);
    return { updated, errors };
  }

  async recalculateUserStats(userId: string): Promise<void> {

    const advertiserStats = await this.prisma.deal.aggregate({
      where: { advertiserId: userId },
      _count: { id: true },
    });

    const advertiserCompleted = await this.prisma.deal.aggregate({
      where: { advertiserId: userId, status: 'COMPLETED' },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const publisherStats = await this.prisma.deal.aggregate({
      where: { channelOwnerId: userId },
      _count: { id: true },
    });

    const publisherCompleted = await this.prisma.deal.aggregate({
      where: { channelOwnerId: userId, status: 'COMPLETED' },
      _count: { id: true },
      _sum: { price: true },
    });

    const totalDeals = advertiserStats._count.id + publisherStats._count.id;
    const successfulDeals = advertiserCompleted._count.id + publisherCompleted._count.id;
    const totalSpent = advertiserCompleted._sum.totalAmount || BigInt(0);
    const totalEarned = publisherCompleted._sum.price || BigInt(0);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totalDeals,
        successfulDeals,
        totalSpent,
        totalEarned,
      },
    });

    this.logger.debug(`Updated stats for user ${userId}: deals=${totalDeals}, successful=${successfulDeals}`);
  }

  async recalculateAllChannelStats(): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    const channels = await this.prisma.channel.findMany({
      select: { id: true },
    });

    for (const channel of channels) {
      try {
        await this.recalculateChannelStats(channel.id);
        updated++;
      } catch (error) {
        errors.push(`Channel ${channel.id}: ${(error as Error).message}`);
      }
    }

    this.logger.log(`Recalculated stats for ${updated} channels, ${errors.length} errors`);
    return { updated, errors };
  }

  async recalculateChannelStats(channelId: string): Promise<void> {
    const totalDealsCount = await this.prisma.deal.count({
      where: { channelId },
    });

    const completedStats = await this.prisma.deal.aggregate({
      where: { channelId, status: 'COMPLETED' },
      _count: { id: true },
      _sum: { price: true },
    });

    await this.prisma.channel.update({
      where: { id: channelId },
      data: {
        totalDeals: totalDealsCount,
        successfulDeals: completedStats._count.id,
        totalEarnings: completedStats._sum.price || BigInt(0),
      },
    });

    this.logger.debug(`Updated stats for channel ${channelId}`);
  }

  async recalculateAll(): Promise<{
    users: { updated: number; errors: string[] };
    channels: { updated: number; errors: string[] };
  }> {
    this.logger.log('Starting full stats recalculation...');

    const users = await this.recalculateAllUserStats();
    const channels = await this.recalculateAllChannelStats();

    this.logger.log('Stats recalculation complete');

    return { users, channels };
  }
}
