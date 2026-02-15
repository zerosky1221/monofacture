import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export interface LeaderboardUser {
  rank: number;
  id: string;
  firstName: string | null;
  telegramUsername: string | null;
  photoUrl: string | null;
  xp: number;
  level: number;
  achievementCount: number;
  totalDeals: number;
  totalEarnings: string;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  users: LeaderboardUser[];
  currentUserRank: number | null;
  currentUser: LeaderboardUser | null;
  totalUsers: number;
}

const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 100 },
  { level: 3, minXp: 300 },
  { level: 4, minXp: 600 },
  { level: 5, minXp: 1000 },
  { level: 6, minXp: 2000 },
  { level: 7, minXp: 3500 },
  { level: 8, minXp: 5500 },
  { level: 9, minXp: 8000 },
  { level: 10, minXp: 12000 },
];

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(private prisma: PrismaService) {}

  calculateLevel(xp: number): number {
    let level = 1;
    for (const l of LEVEL_THRESHOLDS) {
      if (xp >= l.minXp) level = l.level;
    }
    return level;
  }

  getNextLevelXp(currentLevel: number): number {
    const next = LEVEL_THRESHOLDS.find(l => l.level === currentLevel + 1);
    return next?.minXp ?? 999999;
  }

  getCurrentLevelXp(currentLevel: number): number {
    const cur = LEVEL_THRESHOLDS.find(l => l.level === currentLevel);
    return cur?.minXp ?? 0;
  }

  async recalculateUserXp(userId: string): Promise<number> {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });

    const totalXp = userAchievements.reduce(
      (sum, ua) => sum + (ua.achievement.xpReward || 0),
      0,
    );

    const newLevel = this.calculateLevel(totalXp);

    await this.prisma.user.update({
      where: { id: userId },
      data: { xp: totalXp, level: newLevel },
    });

    await this.prisma.userLevel.upsert({
      where: { userId },
      create: { userId, xp: totalXp, totalXp, level: newLevel },
      update: { xp: totalXp, totalXp, level: newLevel },
    });

    return totalXp;
  }

  async recalculateAllUsersXp(): Promise<void> {
    this.logger.log('Recalculating XP for all users...');
    const users = await this.prisma.user.findMany({ select: { id: true } });
    for (const user of users) {
      await this.recalculateUserXp(user.id);
    }
    this.logger.log(`Recalculated XP for ${users.length} users`);
  }

  async getLeaderboard(
    currentUserId: string,
    sortBy: 'xp' | 'deals' | 'earnings' = 'xp',
    limit = 100,
  ): Promise<LeaderboardResponse> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        telegramUsername: true,
        photoUrl: true,
        xp: true,
        level: true,
        _count: {
          select: { achievements: true },
        },
        dealsAsAdvertiser: {
          where: { status: 'COMPLETED' },
          select: { totalAmount: true },
        },
        dealsAsChannelOwner: {
          where: { status: 'COMPLETED' },
          select: { totalAmount: true },
        },
      },
      orderBy: sortBy === 'xp' ? { xp: 'desc' } : undefined,
    });

    const usersWithStats = users.map(user => {
      const totalDeals =
        user.dealsAsAdvertiser.length + user.dealsAsChannelOwner.length;

      const totalEarnings = user.dealsAsChannelOwner.reduce(
        (sum, d) => sum + Number(d.totalAmount || 0),
        0,
      );

      return {
        id: user.id,
        firstName: user.firstName,
        telegramUsername: user.telegramUsername,
        photoUrl: user.photoUrl,
        xp: user.xp || 0,
        level: user.level || 1,
        achievementCount: user._count.achievements,
        totalDeals,
        totalEarnings: totalEarnings.toString(),
        isCurrentUser: user.id === currentUserId,
      };
    });

    if (sortBy === 'deals') {
      usersWithStats.sort((a, b) => b.totalDeals - a.totalDeals || b.xp - a.xp);
    } else if (sortBy === 'earnings') {
      usersWithStats.sort(
        (a, b) => Number(b.totalEarnings) - Number(a.totalEarnings) || b.xp - a.xp,
      );
    } else {
      usersWithStats.sort((a, b) => b.xp - a.xp);
    }

    const rankedUsers: LeaderboardUser[] = usersWithStats.map((user, i) => ({
      ...user,
      rank: i + 1,
    }));

    const currentUser = rankedUsers.find(u => u.id === currentUserId) || null;
    const currentUserRank = currentUser?.rank || null;

    let topUsers = rankedUsers.slice(0, limit);
    if (currentUser && !topUsers.find(u => u.id === currentUserId)) {
      topUsers.push(currentUser);
    }

    return {
      users: topUsers,
      currentUserRank,
      currentUser,
      totalUsers: rankedUsers.length,
    };
  }

  async getUserRankInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        level: true,
        _count: { select: { achievements: true } },
      },
    });

    if (!user) return null;

    const usersAbove = await this.prisma.user.count({
      where: { xp: { gt: user.xp || 0 } },
    });

    const totalUsers = await this.prisma.user.count();

    const currentXp = user.xp || 0;
    const level = this.calculateLevel(currentXp);
    const nextLevelXp = this.getNextLevelXp(level);
    const currentLevelXp = this.getCurrentLevelXp(level);

    return {
      rank: usersAbove + 1,
      totalUsers,
      xp: currentXp,
      level,
      nextLevelXp,
      currentLevelXp,
      xpToNextLevel: nextLevelXp - currentXp,
      xpProgress: currentXp - currentLevelXp,
      xpNeeded: nextLevelXp - currentLevelXp,
      achievementCount: user._count.achievements,
      percentile: totalUsers > 0
        ? Math.round(((totalUsers - usersAbove) / totalUsers) * 100)
        : 100,
    };
  }
}
