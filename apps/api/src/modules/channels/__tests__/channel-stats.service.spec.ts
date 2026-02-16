import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ChannelStatsService } from '../channel-stats.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { RedisService } from '../../../core/redis/redis.service';
import { TelegramBotService } from '../../telegram-bot/telegram-bot.service';
import { QUEUES } from '@telegram-ads/shared';

describe('ChannelStatsService', () => {
  let service: ChannelStatsService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;
  let telegramBotService: jest.Mocked<TelegramBotService>;

  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelStatsService,
        {
          provide: PrismaService,
          useValue: {
            channel: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            channelStats: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
            },
            channelStatsHistory: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: TelegramBotService,
          useValue: {
            getChannelStats: jest.fn(),
            getChannelInfo: jest.fn(),
          },
        },
        {
          provide: getQueueToken(QUEUES.CHANNEL_STATS),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<ChannelStatsService>(ChannelStatsService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    telegramBotService = module.get(TelegramBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scheduleStatsUpdate', () => {
    it('should add job to queue', async () => {
      const channelId = 'channel-123';

      await service.scheduleStatsUpdate(channelId);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'update-stats',
        { channelId },
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
        }),
      );
    });
  });

  describe('getChannelStats', () => {
    it('should return cached stats if available', async () => {
      const channelId = 'channel-123';
      const cachedStats = {
        id: 'stats-1',
        channelId,
        subscriberCount: 1000,
        averageViews: 300,
        averageReach: 250,
        engagementRate: 5.0,
      };

      (redisService.get as jest.Mock).mockResolvedValue(cachedStats);

      const result = await service.getChannelStats(channelId);

      expect(result).toEqual(cachedStats);
      expect(redisService.get).toHaveBeenCalledWith(`channel-stats:${channelId}`);
      expect(prismaService.channelStats.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database if not cached', async () => {
      const channelId = 'channel-123';
      const dbStats = {
        id: 'stats-1',
        channelId,
        subscriberCount: 1000,
        averageViews: 300,
        averageReach: 250,
        engagementRate: 5.0,
      };

      (redisService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.channelStats.findUnique as jest.Mock).mockResolvedValue(dbStats);

      const result = await service.getChannelStats(channelId);

      expect(result).toEqual(dbStats);
      expect(prismaService.channelStats.findUnique).toHaveBeenCalledWith({
        where: { channelId },
      });
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should return null if stats not found', async () => {
      const channelId = 'channel-123';

      (redisService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.channelStats.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getChannelStats(channelId);

      expect(result).toBeNull();
    });
  });

  describe('calculateGrowth', () => {
    it('should return zero growth when no history', async () => {
      const channelId = 'channel-123';

      (prismaService.channelStatsHistory.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.calculateGrowth(channelId);

      expect(result).toEqual({
        growth24h: 0,
        growth7d: 0,
        growth30d: 0,
      });
    });

    it('should calculate growth from history', async () => {
      const channelId = 'channel-123';
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

      const history = [
        { subscriberCount: 1100, recordedAt: now },
        { subscriberCount: 1000, recordedAt: oneDayAgo },
        { subscriberCount: 900, recordedAt: sevenDaysAgo },
      ];

      (prismaService.channelStatsHistory.findMany as jest.Mock).mockResolvedValue(history);

      const result = await service.calculateGrowth(channelId);

      expect(result.growth24h).toBe(100);
      expect(result.growth7d).toBe(200);
    });
  });
});
