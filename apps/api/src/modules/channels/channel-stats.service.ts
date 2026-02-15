import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { PrismaService } from '../../core/database/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { ChannelStatus, ChannelStats } from '@prisma/client';
import { QUEUES, CACHE_TTL } from '@telegram-ads/shared';

@Injectable()
export class ChannelStatsService {
  private readonly logger = new Logger(ChannelStatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @InjectQueue(QUEUES.CHANNEL_STATS) private readonly statsQueue: Queue,
    @Inject(forwardRef(() => TelegramBotService))
    private readonly telegramBot: TelegramBotService,
  ) {}

  async scheduleStatsUpdate(channelId: string): Promise<void> {
    await this.statsQueue.add(
      'update-stats',
      { channelId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    );
  }

  @Cron('0 */6 * * *')
  async scheduleAllStatsUpdate(): Promise<void> {
    const channels = await this.prisma.channel.findMany({
      where: {
        status: {
          in: [ChannelStatus.VERIFIED, ChannelStatus.ACTIVE],
        },
        isBotAdded: true,
      },
      select: { id: true },
    });

    this.logger.log(`Scheduling stats update for ${channels.length} channels`);

    for (const channel of channels) {
      await this.scheduleStatsUpdate(channel.id);
    }
  }

  async getChannelStats(channelId: string): Promise<ChannelStats | null> {
    const cacheKey = `channel-stats:${channelId}`;
    const cached = await this.redisService.get<ChannelStats>(cacheKey);

    if (cached) {
      return cached;
    }

    const stats = await this.prisma.channelStats.findUnique({
      where: { channelId },
    });

    if (stats) {
      await this.redisService.set(cacheKey, stats, CACHE_TTL.CHANNEL_STATS);
    }

    return stats;
  }

  async updateChannelStats(channelId: string): Promise<ChannelStats> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    const currentStats = await this.prisma.channelStats.findUnique({
      where: { channelId },
    });

    const now = new Date();
    let subscriberCount = channel.subscriberCount || 0;
    let averageViews = Math.floor(subscriberCount * 0.3);
    let averageReach = Math.floor(subscriberCount * 0.25);
    let averageReactions = 0;
    let averageForwards = 0;
    let engagementRate = 5.0;
    let languageDistribution: Record<string, number> = {};

    try {
      const telegramStats = await this.telegramBot.getChannelStats(
        channel.telegramId.toString(),
      );

      if (telegramStats) {
        subscriberCount = telegramStats.subscriberCount;
        averageViews = telegramStats.averageViewsPerPost;
        averageReach = Math.floor(telegramStats.averageViewsPerPost * 0.85);
        averageReactions = telegramStats.averageReactionsPerPost;
        averageForwards = telegramStats.averageForwardsPerPost;
        languageDistribution = telegramStats.languageDistribution;

        if (averageViews > 0) {
          engagementRate = ((averageReactions + averageForwards) / averageViews) * 100;
        }

        this.logger.log(`Fetched real Telegram stats for channel ${channelId}: ${subscriberCount} subscribers`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Telegram stats for channel ${channelId}, using cached/estimated values: ${(error as Error).message}`,
      );
    }

    try {
      const channelInfo = await this.telegramBot.getChannelInfo(
        channel.telegramId.toString(),
      );

      if (channelInfo) {

        const updates: Record<string, any> = {};
        if (channelInfo.title && channelInfo.title !== channel.title) {
          updates.title = channelInfo.title;
        }
        if (channelInfo.username && channelInfo.username !== channel.username) {
          updates.username = channelInfo.username.toLowerCase();
        }
        if (channelInfo.description && channelInfo.description !== channel.description) {
          updates.description = channelInfo.description;
        }
        if (channelInfo.photo && channelInfo.photo !== channel.photoUrl) {
          updates.photoUrl = channelInfo.photo;
        }

        if (Object.keys(updates).length > 0) {
          await this.prisma.channel.update({
            where: { id: channelId },
            data: updates,
          });
          this.logger.debug(`Updated channel info for ${channelId}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch channel info: ${(error as Error).message}`);
    }

    const stats = await this.prisma.channelStats.upsert({
      where: { channelId },
      create: {
        channelId,
        subscriberCount,
        averageViews,
        averageReach,
        engagementRate,
        lastFetchedAt: now,
      },
      update: {
        subscriberCount,
        subscriberGrowth24h: currentStats
          ? subscriberCount - currentStats.subscriberCount
          : 0,
        averageViews,
        averageReach,
        engagementRate,
        lastFetchedAt: now,
      },
    });

    await this.prisma.channel.update({
      where: { id: channelId },
      data: {
        subscriberCount: stats.subscriberCount,
        averageViews: stats.averageViews,
        averageReach: stats.averageReach,
        engagementRate: stats.engagementRate,
        statsUpdatedAt: now,
      },
    });

    await this.prisma.channelStatsHistory.create({
      data: {
        channelId,
        subscriberCount: stats.subscriberCount,
        averageViews: stats.averageViews,
        engagementRate: stats.engagementRate,
      },
    });

    await this.redisService.del(`channel-stats:${channelId}`);
    await this.redisService.del(`channel:${channelId}`);

    this.logger.debug(`Updated stats for channel ${channelId}`);

    return stats;
  }

  async schedulePhotoUpdate(): Promise<void> {
    await this.statsQueue.add(
      'update-photos',
      {},
      {
        attempts: 1,
        removeOnComplete: true,
      },
    );
    this.logger.log('Scheduled photo update job');
  }

  async calculateGrowth(channelId: string): Promise<{
    growth24h: number;
    growth7d: number;
    growth30d: number;
  }> {
    const history = await this.prisma.channelStatsHistory.findMany({
      where: { channelId },
      orderBy: { recordedAt: 'desc' },
      take: 365,
    });

    if (history.length === 0) {
      return { growth24h: 0, growth7d: 0, growth30d: 0 };
    }

    const now = history[0]?.subscriberCount || 0;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const history24h = history.find((h) => h.recordedAt <= oneDayAgo);
    const history7d = history.find((h) => h.recordedAt <= sevenDaysAgo);
    const history30d = history.find((h) => h.recordedAt <= thirtyDaysAgo);

    return {
      growth24h: history24h ? now - history24h.subscriberCount : 0,
      growth7d: history7d ? now - history7d.subscriberCount : 0,
      growth30d: history30d ? now - history30d.subscriberCount : 0,
    };
  }
}
