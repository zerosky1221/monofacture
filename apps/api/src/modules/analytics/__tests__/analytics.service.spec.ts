import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../analytics.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: any;

  const mockPrisma = {
    channel: { findMany: jest.fn() },
    deal: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    balanceTransaction: { aggregate: jest.fn(), findMany: jest.fn() },
    user: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get(PrismaService);
  });

  describe('getPublisherOverview', () => {
    it('should return overview with channel count and earnings', async () => {
      prisma.channel.findMany.mockResolvedValue([{ id: 'ch-1' }, { id: 'ch-2' }]);
      prisma.deal.count.mockResolvedValue(5);
      prisma.balanceTransaction.aggregate.mockResolvedValue({ _sum: { amount: BigInt(10000000000) } });

      const result = await service.getPublisherOverview('user-1');

      expect(result.totalChannels).toBe(2);
      expect(result.totalDeals).toBe(5);
      expect(result.totalEarnings).toBe('10000000000');
    });

    it('should handle zero earnings', async () => {
      prisma.channel.findMany.mockResolvedValue([]);
      prisma.deal.count.mockResolvedValue(0);
      prisma.balanceTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.getPublisherOverview('user-1');

      expect(result.totalChannels).toBe(0);
      expect(result.totalEarnings).toBe('0');
    });
  });

  describe('getEarningsChart', () => {
    it('should group transactions by date', async () => {
      prisma.balanceTransaction.findMany.mockResolvedValue([
        { amount: BigInt(1000000000), createdAt: new Date('2026-02-01') },
        { amount: BigInt(2000000000), createdAt: new Date('2026-02-01') },
        { amount: BigInt(500000000), createdAt: new Date('2026-02-02') },
      ]);

      const result = await service.getEarningsChart('user-1', '7d');

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-02-01');
      expect(result[0].amount).toBe('3000000000');
    });
  });

  describe('getDashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      prisma.channel.findMany.mockResolvedValue([
        { id: 'ch-1', title: 'Test', rating: 4.5, subscriberCount: 1000, averageViews: 500, totalEarnings: BigInt(0), totalDeals: 0, username: 'test', photoUrl: null },
      ]);
      prisma.deal.count.mockResolvedValue(3);
      prisma.balanceTransaction.aggregate.mockResolvedValue({ _sum: { amount: BigInt(5000000000) } });
      prisma.balanceTransaction.findMany.mockResolvedValue([]);
      prisma.deal.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.getDashboard('user-1', '30d');

      expect(result).toHaveProperty('totalEarnings');
      expect(result).toHaveProperty('totalDeals');
      expect(result).toHaveProperty('totalChannels');
      expect(result).toHaveProperty('rating');
      expect(result).toHaveProperty('earningsChart');
      expect(result).toHaveProperty('formatBreakdown');
      expect(result).toHaveProperty('topAdvertisers');
      expect(result).toHaveProperty('channelStats');
      expect(result.totalChannels).toBe(1);
    });
  });

  describe('getAdvertiserOverview', () => {
    it('should return advertiser stats', async () => {
      prisma.deal.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2);
      prisma.deal.aggregate = jest.fn().mockResolvedValue({ _sum: { totalAmount: BigInt(50000000000) } });

      const result = await service.getAdvertiserOverview('user-1');

      expect(result.totalDeals).toBe(10);
      expect(result.activeDeals).toBe(2);
    });
  });
});
