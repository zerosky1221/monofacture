import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../core/database/prisma.service';
import { QUEUES } from '@telegram-ads/shared';

@Injectable()
export class ScheduledTasksService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectQueue(QUEUES.CHANNEL_STATS) private readonly statsQueue: Queue,
    @InjectQueue(QUEUES.DEAL_TIMEOUT) private readonly timeoutQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Scheduled tasks service initialized');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async collectChannelStats(): Promise<void> {
    this.logger.log('Starting hourly channel stats collection');

    try {
      await this.statsQueue.add(
        'collect-all-stats',
        {},
        {
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to queue stats collection: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async calculateChannelGrowth(): Promise<void> {
    this.logger.log('Starting daily channel growth calculation');

    try {
      const channels = await this.prisma.channel.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const channel of channels) {
        await this.statsQueue.add(
          'calculate-growth',
          { channelId: channel.id },
          {
            removeOnComplete: true,
          },
        );
      }

      this.logger.log(`Queued growth calculation for ${channels.length} channels`);
    } catch (error) {
      this.logger.error(`Failed to queue growth calculation: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkDealTimeouts(): Promise<void> {
    this.logger.log('Starting deal timeout check');

    try {
      await this.timeoutQueue.add(
        'check-all-timeouts',
        {},
        {
          removeOnComplete: true,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to queue timeout check: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkEscrowExpiry(): Promise<void> {
    this.logger.log('Starting escrow expiry check');

    try {
      await this.timeoutQueue.add(
        'check-escrow-expiry',
        {},
        {
          removeOnComplete: true,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to queue escrow check: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldNotifications(): Promise<void> {
    this.logger.log('Cleaning up old notifications');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.notification.deleteMany({
        where: {
          isRead: true,
          createdAt: { lt: thirtyDaysAgo },
        },
      });

      this.logger.log(`Deleted ${result.count} old notifications`);
    } catch (error) {
      this.logger.error(`Failed to cleanup notifications: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupOldStatsHistory(): Promise<void> {
    this.logger.log('Cleaning up old stats history');

    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await this.prisma.channelStatsHistory.deleteMany({
        where: {
          recordedAt: { lt: ninetyDaysAgo },
        },
      });

      this.logger.log(`Deleted ${result.count} old stats records`);
    } catch (error) {
      this.logger.error(`Failed to cleanup stats history: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredSessions(): Promise<void> {
    this.logger.log('Cleaning up expired sessions');

    try {
      const result = await this.prisma.userSession.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      this.logger.log(`Deleted ${result.count} expired sessions`);
    } catch (error) {
      this.logger.error(`Failed to cleanup sessions: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async updatePlatformStats(): Promise<void> {
    this.logger.log('Updating platform statistics');

    try {
      const [
        totalUsers,
        activeUsers,
        totalChannels,
        activeChannels,
        totalDeals,
        completedDeals,
        totalVolume,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: {
            lastActiveAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        this.prisma.channel.count(),
        this.prisma.channel.count({ where: { isActive: true } }),
        this.prisma.deal.count(),
        this.prisma.deal.count({
          where: { status: 'COMPLETED' },
        }),
        this.prisma.escrow.aggregate({
          _sum: { totalAmount: true },
          where: { status: 'RELEASED' },
        }),
      ]);

      this.logger.log(`Platform Stats:
        - Total Users: ${totalUsers}
        - Active Users (30d): ${activeUsers}
        - Total Channels: ${totalChannels}
        - Active Channels: ${activeChannels}
        - Total Deals: ${totalDeals}
        - Completed Deals: ${completedDeals}
        - Total Volume: ${totalVolume._sum.totalAmount || 0} nanoTON`);
    } catch (error) {
      this.logger.error(`Failed to update platform stats: ${(error as Error).message}`);
    }
  }
}
