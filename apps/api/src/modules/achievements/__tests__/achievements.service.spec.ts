import { Test, TestingModule } from '@nestjs/testing';
import { AchievementsService } from '../achievements.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('AchievementsService', () => {
  let service: AchievementsService;
  let prisma: any;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    achievement: { findMany: jest.fn(), findUnique: jest.fn() },
    userAchievement: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    userLevel: { findUnique: jest.fn(), create: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    deal: { count: jest.fn() },
    review: { count: jest.fn() },
    referral: { count: jest.fn() },
    balanceTransaction: { aggregate: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AchievementsService>(AchievementsService);
    prisma = module.get(PrismaService);
  });

  describe('getUserAchievements', () => {
    it('should return achievements with unlock status', async () => {
      const achievements = [
        { id: 'ach-1', key: 'first_login', name: 'First Login', category: 'deals', isActive: true, order: 1 },
        { id: 'ach-2', key: 'first_deal', name: 'First Deal', category: 'deals', isActive: true, order: 2 },
      ];
      const userAchievements = [
        { achievementId: 'ach-1', achievement: achievements[0], unlockedAt: new Date() },
      ];

      prisma.achievement.findMany.mockResolvedValue(achievements);
      prisma.userAchievement.findMany.mockResolvedValue(userAchievements);
      prisma.userLevel.findUnique.mockResolvedValue({ userId: 'user-1', level: 1, xp: 0, totalXp: 0 });

      const result = await service.getUserAchievements('user-1');

      expect(result.achievements).toHaveLength(2);
      expect(result.achievements[0].unlocked).toBe(true);
      expect(result.achievements[1].unlocked).toBe(false);
      expect(result.stats.unlocked).toBe(1);
      expect(result.stats.total).toBe(2);
    });
  });

  describe('getUserLevel', () => {
    it('should create level if not exists', async () => {
      prisma.userLevel.findUnique.mockResolvedValue(null);
      prisma.userLevel.create.mockResolvedValue({ userId: 'user-1', level: 1, xp: 0, totalXp: 0 });

      const result = await service.getUserLevel('user-1');

      expect(prisma.userLevel.create).toHaveBeenCalledWith({ data: { userId: 'user-1' } });
      expect(result.levelName).toBe('Newcomer');
    });

    it('should return correct level for XP amount', async () => {
      prisma.userLevel.findUnique.mockResolvedValue({ userId: 'user-1', level: 3, xp: 400, totalXp: 400 });

      const result = await service.getUserLevel('user-1');

      expect(result.levelName).toBe('Trader');
      expect(result.nextLevel).toBeDefined();
      expect(result.nextLevel?.level).toBe(4);
    });
  });

  describe('addXp', () => {
    it('should increment XP and check for level up', async () => {
      prisma.userLevel.upsert.mockResolvedValue({ userId: 'user-1', level: 1, xp: 150, totalXp: 150 });
      prisma.userLevel.update.mockResolvedValue({ userId: 'user-1', level: 2, xp: 150, totalXp: 150 });

      const result = await service.addXp('user-1', 150);

      expect(prisma.userLevel.upsert).toHaveBeenCalled();
      expect(prisma.userLevel.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { level: 2 },
      });
    });
  });

  describe('checkAndUnlock', () => {
    it('should award achievement if not already awarded', async () => {
      prisma.achievement.findUnique.mockResolvedValue({ id: 'ach-1', key: 'first_login', xpReward: 10 });
      prisma.userAchievement.findUnique.mockResolvedValue(null);
      prisma.userAchievement.create.mockResolvedValue({ id: 'ua-1', achievement: { xpReward: 10 } });
      prisma.userLevel.upsert.mockResolvedValue({ level: 1, totalXp: 10 });

      const result = await service.checkAndUnlock('user-1', 'first_login');

      expect(result).not.toBeNull();
      expect(prisma.userAchievement.create).toHaveBeenCalled();
    });

    it('should return null if achievement already awarded', async () => {
      prisma.achievement.findUnique.mockResolvedValue({ id: 'ach-1', key: 'first_login', xpReward: 10 });
      prisma.userAchievement.findUnique.mockResolvedValue({ id: 'ua-1' });

      const result = await service.checkAndUnlock('user-1', 'first_login');

      expect(result).toBeNull();
      expect(prisma.userAchievement.create).not.toHaveBeenCalled();
    });

    it('should return null if achievement key not found', async () => {
      prisma.achievement.findUnique.mockResolvedValue(null);

      const result = await service.checkAndUnlock('user-1', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('checkAndAwardAll', () => {
    it('should return empty when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.checkAndAwardAll('user-1');

      expect(result.newlyAwarded).toEqual([]);
    });

    it('should check wallet_connected when user has wallet', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        tonWalletAddress: '0:abc',
        photoUrl: null,
        firstName: 'Test',
        ownedChannels: [],
        dealsAsAdvertiser: [],
      });
      prisma.deal.count.mockResolvedValue(0);
      prisma.review.count.mockResolvedValue(0);
      prisma.referral.count.mockResolvedValue(0);
      prisma.balanceTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.achievement.findUnique.mockResolvedValue({ id: 'ach-1', key: 'wallet_connected', xpReward: 20 });
      prisma.userAchievement.findUnique.mockResolvedValue(null);
      prisma.userAchievement.create.mockResolvedValue({ id: 'ua-1', achievement: { xpReward: 20 } });
      prisma.userLevel.upsert.mockResolvedValue({ level: 1, totalXp: 20 });

      const result = await service.checkAndAwardAll('user-1');

      expect(result.newlyAwarded.length).toBeGreaterThan(0);
    });
  });

  describe('getLeaderboard', () => {
    it('should return sorted leaderboard', async () => {
      prisma.userLevel.findMany = jest.fn().mockResolvedValue([
        { user: { id: 'u1', firstName: 'Alice' }, level: 3, totalXp: 500 },
        { user: { id: 'u2', firstName: 'Bob' }, level: 2, totalXp: 200 },
      ]);

      const result = await service.getLeaderboard(10);

      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(1);
      expect(result[0].user.firstName).toBe('Alice');
      expect(result[1].rank).toBe(2);
    });
  });
});
