import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

const LEVELS = [
  { level: 1, xpRequired: 0, name: 'Newcomer' },
  { level: 2, xpRequired: 100, name: 'Explorer' },
  { level: 3, xpRequired: 300, name: 'Trader' },
  { level: 4, xpRequired: 600, name: 'Professional' },
  { level: 5, xpRequired: 1000, name: 'Expert' },
  { level: 6, xpRequired: 2000, name: 'Master' },
  { level: 7, xpRequired: 3500, name: 'Grandmaster' },
  { level: 8, xpRequired: 5500, name: 'Champion' },
  { level: 9, xpRequired: 8000, name: 'Hero' },
  { level: 10, xpRequired: 12000, name: 'Legend' },
];

@Injectable()
export class AchievementsService {
  constructor(private prisma: PrismaService) {}

  async getAllAchievements() {
    return this.prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });
  }

  async getUserAchievements(userId: string) {
    const [achievements, userAchievements, userLevel] = await Promise.all([
      this.prisma.achievement.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { order: 'asc' }] }),
      this.prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
      this.getUserLevel(userId),
    ]);

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

    return {
      achievements: achievements.map(a => ({
        ...a,
        unlocked: unlockedIds.has(a.id),
        unlockedAt: userAchievements.find(ua => ua.achievementId === a.id)?.unlockedAt,
      })),
      level: userLevel,
      stats: {
        total: achievements.length,
        unlocked: userAchievements.length,
      },
    };
  }

  async getUserLevel(userId: string) {
    let userLevel = await this.prisma.userLevel.findUnique({ where: { userId } });
    if (!userLevel) {
      userLevel = await this.prisma.userLevel.create({ data: { userId } });
    }
    const currentLevel = LEVELS.filter(l => l.xpRequired <= userLevel.totalXp).pop() || LEVELS[0];
    const nextLevel = LEVELS.find(l => l.xpRequired > userLevel.totalXp);

    return {
      ...userLevel,
      levelName: currentLevel.name,
      nextLevel: nextLevel ? { level: nextLevel.level, name: nextLevel.name, xpRequired: nextLevel.xpRequired } : null,
      progress: nextLevel ? ((userLevel.totalXp - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100 : 100,
    };
  }

  async addXp(userId: string, amount: number) {
    const userLevel = await this.prisma.userLevel.upsert({
      where: { userId },
      create: { userId, xp: amount, totalXp: amount },
      update: { xp: { increment: amount }, totalXp: { increment: amount } },
    });

    const newLevel = LEVELS.filter(l => l.xpRequired <= userLevel.totalXp).pop() || LEVELS[0];
    if (newLevel.level !== userLevel.level) {
      await this.prisma.userLevel.update({ where: { userId }, data: { level: newLevel.level } });
    }

    return userLevel;
  }

  async checkAndUnlock(userId: string, achievementKey: string) {
    const achievement = await this.prisma.achievement.findUnique({ where: { key: achievementKey } });
    if (!achievement) return null;

    const existing = await this.prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
    });
    if (existing) return null;

    const ua = await this.prisma.userAchievement.create({
      data: { userId, achievementId: achievement.id },
      include: { achievement: true },
    });

    if (achievement.xpReward > 0) {
      await this.addXp(userId, achievement.xpReward);
    }

    return ua;
  }

  async checkAndAwardAll(userId: string) {
    const logger = new Logger('AchievementsService');
    logger.log(`Checking achievements for user ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedChannels: true,
        dealsAsAdvertiser: true,
      },
    });
    if (!user) return { newlyAwarded: [], totalXpGained: 0 };

    const [channelDeals, channelDealsCompleted, reviewsGiven, reviewsReceived, referralCount, fiveStarReviews] = await Promise.all([
      this.prisma.deal.count({ where: { channel: { ownerId: userId } } }),
      this.prisma.deal.count({ where: { channel: { ownerId: userId }, status: 'COMPLETED' } }),
      this.prisma.review.count({ where: { authorId: userId } }),
      this.prisma.review.count({ where: { recipientId: userId } }),
      this.prisma.referral.count({ where: { referrerId: userId } }),
      this.prisma.review.count({ where: { recipientId: userId, rating: 5 } }),
    ]);

    const completedAsAdvertiser = user.dealsAsAdvertiser.filter(d => d.status === 'COMPLETED').length;
    const totalCompletedDeals = completedAsAdvertiser + channelDealsCompleted;

    const earningsAgg = await this.prisma.balanceTransaction.aggregate({
      where: { balance: { userId }, type: 'DEAL_EARNING' },
      _sum: { amount: true },
    }).catch(() => ({ _sum: { amount: null } }));
    const totalEarnings = Number(earningsAgg._sum.amount || 0);

    const verifiedChannels = user.ownedChannels.filter(
      c => (c as any).verificationTier && (c as any).verificationTier !== 'NONE',
    ).length;

    const checks: Record<string, boolean> = {
      first_login: true,
      profile_complete: !!user.photoUrl || !!user.firstName,
      wallet_connected: !!user.tonWalletAddress,
      first_channel: user.ownedChannels.length >= 1,
      five_channels: user.ownedChannels.length >= 5,
      verified_channel: verifiedChannels >= 1,
      first_deal: totalCompletedDeals >= 1,
      ten_deals: totalCompletedDeals >= 10,
      fifty_deals: totalCompletedDeals >= 50,
      hundred_deals: totalCompletedDeals >= 100,
      first_earning: totalEarnings >= 1e9,
      hundred_ton: totalEarnings >= 100e9,
      thousand_ton: totalEarnings >= 1000e9,
      first_review: reviewsGiven >= 1,
      five_reviews: reviewsGiven >= 5,
      five_star_rating: fiveStarReviews >= 10,
      first_referral: referralCount >= 1,
      five_referrals: referralCount >= 5,
      ten_referrals: referralCount >= 10,
      twenty_referrals: referralCount >= 20,
    };

    const newlyAwarded: string[] = [];
    let totalXpGained = 0;

    for (const [key, shouldAward] of Object.entries(checks)) {
      if (shouldAward) {
        const result = await this.checkAndUnlock(userId, key);
        if (result) {
          newlyAwarded.push(key);
          totalXpGained += result.achievement.xpReward;
          logger.log(`Awarded achievement "${key}" to user ${userId}`);
        }
      }
    }

    logger.log(`Awarded ${newlyAwarded.length} achievements, ${totalXpGained} XP for user ${userId}`);
    return { newlyAwarded, totalXpGained };
  }

  async getLeaderboard(limit = 20) {
    const levels = await this.prisma.userLevel.findMany({
      orderBy: { totalXp: 'desc' },
      take: limit,
      include: { user: { select: { id: true, firstName: true, telegramUsername: true, photoUrl: true } } },
    });

    return levels.map((l, i) => {
      const currentLevel = LEVELS.filter(lv => lv.xpRequired <= l.totalXp).pop() || LEVELS[0];
      return { rank: i + 1, user: l.user, level: l.level, levelName: currentLevel.name, totalXp: l.totalXp };
    });
  }
}
