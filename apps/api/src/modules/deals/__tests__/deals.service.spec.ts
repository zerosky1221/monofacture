import { Test, TestingModule } from '@nestjs/testing';
import { DealsService } from '../deals.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { RedisService } from '../../../core/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { DealStateMachine } from '../deal-state-machine';
import { EscrowService } from '../../escrow/escrow.service';
import { AchievementsService } from '../../achievements/achievements.service';
import { getQueueToken } from '@nestjs/bull';

describe('DealsService', () => {
  let service: DealsService;
  let prisma: any;

  const mockPrisma: any = {
    deal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    dealTimeline: { create: jest.fn(), findMany: jest.fn() },
    dealCreative: { upsert: jest.fn(), update: jest.fn() },
    channel: { findUnique: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
  };

  const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn(), exists: jest.fn() };
  const mockConfig = { get: jest.fn().mockReturnValue(0.05) };
  const mockStateMachine = {
    accept: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
    submitCreative: jest.fn(),
    approveCreative: jest.fn(),
    requestRevision: jest.fn(),
    schedule: jest.fn(),
    expire: jest.fn(),
    confirmPosted: jest.fn(),
  };
  const mockEscrow = { createEscrow: jest.fn(), releaseFunds: jest.fn(), refundAdvertiser: jest.fn() };
  const mockAchievements = { checkAndAwardAll: jest.fn().mockResolvedValue({ newlyAwarded: [], totalXpGained: 0 }) };
  const mockQueue = { add: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
        { provide: DealStateMachine, useValue: mockStateMachine },
        { provide: EscrowService, useValue: mockEscrow },
        { provide: AchievementsService, useValue: mockAchievements },
        { provide: getQueueToken('deal-timeout'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<DealsService>(DealsService);
    prisma = module.get(PrismaService);
  });

  describe('findById', () => {
    it('should return cached deal if available', async () => {
      const deal = { id: 'deal-1', status: 'CREATED' };
      mockRedis.get.mockResolvedValue(deal);

      const result = await service.findById('deal-1');

      expect(result).toEqual(deal);
      expect(prisma.deal.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if not cached', async () => {
      const deal = { id: 'deal-1', status: 'CREATED' };
      mockRedis.get.mockResolvedValue(null);
      prisma.deal.findUnique.mockResolvedValue(deal);

      const result = await service.findById('deal-1');

      expect(result).toEqual(deal);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException when deal not found', async () => {
      mockRedis.get.mockResolvedValue(null);
      prisma.deal.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow('Deal not found');
    });
  });

  describe('getCalendarDeals', () => {
    it('should return deals for given month', async () => {
      const deals = [
        { id: 'd1', scheduledPostTime: new Date('2026-02-15'), channel: { title: 'Test' } },
      ];
      prisma.deal.findMany.mockResolvedValue(deals);

      const result = await service.getCalendarDeals('user-1', 2, 2026);

      expect(result).toHaveLength(1);
      expect(prisma.deal.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ AND: expect.any(Array) }),
      }));
    });
  });

  describe('confirmCompletion', () => {
    it('should trigger achievement check for both parties', async () => {
      const deal = { id: 'd1', advertiserId: 'adv-1', channelOwnerId: 'own-1', status: 'POSTED' };
      mockRedis.get.mockResolvedValue(deal);
      mockEscrow.releaseFunds.mockResolvedValue(undefined);

      mockRedis.get
        .mockResolvedValueOnce(deal)
        .mockResolvedValueOnce({ ...deal, status: 'COMPLETED' });

      await service.confirmCompletion('d1', 'adv-1');

      expect(mockEscrow.releaseFunds).toHaveBeenCalledWith('d1');
      expect(mockAchievements.checkAndAwardAll).toHaveBeenCalledWith('adv-1');
      expect(mockAchievements.checkAndAwardAll).toHaveBeenCalledWith('own-1');
    });
  });
});
