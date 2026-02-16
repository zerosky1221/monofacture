import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../core/database/prisma.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUES, EVENTS } from '@telegram-ads/shared';

interface StatsJobData {
  channelId: string;
  telegramId: bigint;
}

@Injectable()
@Processor(QUEUES.CHANNEL_STATS)
export class ChannelStatsCollector {
  private readonly logger = new Logger(ChannelStatsCollector.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TelegramBotService))
    private readonly telegramBotService: TelegramBotService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Process('collect-stats')
  async handleCollectStats(job: Job<StatsJobData>): Promise<void> {
    const { channelId, telegramId } = job.data;

    this.logger.debug(`Collecting stats for channel ${channelId}`);

    try {

      const channelInfo = await this.telegramBotService.getChannelInfo(Number(telegramId));

      if (!channelInfo) {
        this.logger.warn(`Could not get info for channel ${channelId}`);
        return;
      }

      const existingStats = await this.prisma.channelStats.findUnique({
        where: { channelId },
      });

      const oldSubscriberCount = existingStats?.subscriberCount || 0;
      const newSubscriberCount = channelInfo.memberCount || 0;

      const stats = await this.prisma.channelStats.upsert({
        where: { channelId },
        create: {
          channelId,
          subscriberCount: newSubscriberCount,
          subscriberGrowth24h: 0,
          subscriberGrowth7d: 0,
          subscriberGrowth30d: 0,
          lastFetchedAt: new Date(),
        },
        update: {
          subscriberCount: newSubscriberCount,
          subscriberGrowth24h: newSubscriberCount - oldSubscriberCount,
          lastFetchedAt: new Date(),
        },
      });

      await this.prisma.channel.update({
        where: { id: channelId },
        data: {
          subscriberCount: newSubscriberCount,
          statsUpdatedAt: new Date(),

          ...(channelInfo.photo && { photoUrl: channelInfo.photo }),

          ...(channelInfo.title && { title: channelInfo.title }),
        },
      });

      await this.prisma.channelStatsHistory.create({
        data: {
          channelId,
          subscriberCount: newSubscriberCount,
          averageViews: stats.averageViews,
          engagementRate: stats.engagementRate,
        },
      });

      this.eventEmitter.emit(EVENTS.CHANNEL_STATS_UPDATED, {
        channelId,
        subscriberCount: newSubscriberCount,
        growth: newSubscriberCount - oldSubscriberCount,
      });

      this.logger.log(
        `Stats updated for channel ${channelId}: ${newSubscriberCount} subscribers`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to collect stats for channel ${channelId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @Process('collect-all-stats')
  async handleCollectAllStats(job: Job): Promise<void> {
    this.logger.debug('Collecting stats for all active channels');

    const channels = await this.prisma.channel.findMany({
      where: {
        isActive: true,
        isBotAdded: true,
      },
      select: {
        id: true,
        telegramId: true,
      },
    });

    this.logger.log(`Found ${channels.length} active channels to update`);

    let processed = 0;
    let failed = 0;

    for (const channel of channels) {
      try {
        await this.handleCollectStats({
          data: {
            channelId: channel.id,
            telegramId: channel.telegramId,
          },
        } as Job<StatsJobData>);
        processed++;

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to update channel ${channel.id}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Stats collection complete: ${processed} success, ${failed} failed`,
    );
  }

  @Process('update-photos')
  async handleUpdatePhotos(job: Job): Promise<void> {
    this.logger.log('Updating photos for all channels without photos');

    const channels = await this.prisma.channel.findMany({
      where: {
        OR: [
          { photoUrl: null },
          { photoUrl: '' },
        ],
        telegramId: { not: BigInt(0) },
      },
      select: {
        id: true,
        telegramId: true,
        title: true,
      },
    });

    this.logger.log(`Found ${channels.length} channels without photos`);

    let updated = 0;
    let failed = 0;

    for (const channel of channels) {
      try {
        const channelInfo = await this.telegramBotService.getChannelInfo(
          Number(channel.telegramId),
        );

        if (channelInfo?.photo) {
          await this.prisma.channel.update({
            where: { id: channel.id },
            data: {
              photoUrl: channelInfo.photo,

              ...(channelInfo.title && { title: channelInfo.title }),
              ...(channelInfo.memberCount && { subscriberCount: channelInfo.memberCount }),
            },
          });
          updated++;
          this.logger.debug(`Updated photo for channel ${channel.title}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to update photo for channel ${channel.id}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(`Photo update complete: ${updated} updated, ${failed} failed`);
  }

  @Process('calculate-growth')
  async handleCalculateGrowth(job: Job<{ channelId: string }>): Promise<void> {
    const { channelId } = job.data;

    this.logger.debug(`Calculating growth for channel ${channelId}`);

    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [history1d, history7d, history30d, currentStats] = await Promise.all([
        this.prisma.channelStatsHistory.findFirst({
          where: {
            channelId,
            recordedAt: { lte: oneDayAgo },
          },
          orderBy: { recordedAt: 'desc' },
        }),
        this.prisma.channelStatsHistory.findFirst({
          where: {
            channelId,
            recordedAt: { lte: sevenDaysAgo },
          },
          orderBy: { recordedAt: 'desc' },
        }),
        this.prisma.channelStatsHistory.findFirst({
          where: {
            channelId,
            recordedAt: { lte: thirtyDaysAgo },
          },
          orderBy: { recordedAt: 'desc' },
        }),
        this.prisma.channelStats.findUnique({
          where: { channelId },
        }),
      ]);

      if (!currentStats) return;

      const current = currentStats.subscriberCount;

      await this.prisma.channelStats.update({
        where: { channelId },
        data: {
          subscriberGrowth24h: history1d ? current - history1d.subscriberCount : 0,
          subscriberGrowth7d: history7d ? current - history7d.subscriberCount : 0,
          subscriberGrowth30d: history30d ? current - history30d.subscriberCount : 0,
        },
      });

      this.logger.log(`Growth calculated for channel ${channelId}`);
    } catch (error) {
      this.logger.error(
        `Failed to calculate growth for channel ${channelId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Channel stats job ${job.id} failed: ${error.message}`);
  }
}
