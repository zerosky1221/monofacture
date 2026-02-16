import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private readonly botUsername: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.botUsername = this.configService.get<string>('telegram.botUsername') || 'monofacturebot';
  }

  async getOrCreateReferralCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, telegramId: true },
    });

    if (user?.referralCode) return user.referralCode;

    const code = `ref_${crypto.randomBytes(4).toString('hex')}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    this.logger.log(`Generated referral code ${code} for user ${userId}`);
    return code;
  }

  async applyReferralCode(newUserId: string, code: string): Promise<boolean> {
    this.logger.log(`Applying referral code ${code} for user ${newUserId}`);

    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true, telegramId: true, firstName: true },
    });

    if (!referrer) {
      this.logger.warn(`Invalid referral code: ${code}`);
      return false;
    }

    if (referrer.id === newUserId) {
      this.logger.warn(`User ${newUserId} tried to refer themselves`);
      return false;
    }

    const existing = await this.prisma.referral.findUnique({
      where: { referredUserId: newUserId },
    });

    if (existing) {
      this.logger.warn(`User ${newUserId} already has a referrer`);
      return false;
    }

    await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredUserId: newUserId,
        referralCode: code,
      },
    });

    this.logger.log(`✅ Referral applied: ${referrer.id} (${referrer.firstName}) referred ${newUserId} via ${code}`);
    return true;
  }

  async getReferralStats(userId: string) {
    const code = await this.getOrCreateReferralCode(userId);

    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
    });

    const referredUserIds = referrals.map(r => r.referredUserId);
    const referredUsers = await this.prisma.user.findMany({
      where: { id: { in: referredUserIds } },
      select: {
        id: true,
        firstName: true,
        telegramUsername: true,
        createdAt: true,
        totalDeals: true,
        successfulDeals: true,
      },
    });

    const userMap = new Map(referredUsers.map(u => [u.id, u]));

    const totals = await this.prisma.referral.aggregate({
      where: { referrerId: userId },
      _sum: {
        totalEarned: true,
        dealCount: true,
      },
      _count: true,
    });

    const recentEarnings = await this.prisma.referralEarning.findMany({
      where: { referral: { referrerId: userId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        deal: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
          },
        },
      },
    });

    return {
      referralCode: code,
      referralLink: `https://t.me/${this.botUsername}?startapp=${code}`,
      totalReferred: totals._count,
      totalDeals: Number(totals._sum.dealCount || 0),
      totalEarned: (totals._sum.totalEarned || 0n).toString(),
      referrals: referrals.map(r => {
        const user = userMap.get(r.referredUserId);
        return {
          id: r.id,
          referredUserId: r.referredUserId,
          userName: user?.firstName || 'User',
          username: user?.telegramUsername,
          joinedAt: r.createdAt,
          userJoinedAt: user?.createdAt,
          dealCount: r.dealCount,
          totalEarned: r.totalEarned.toString(),
          isActive: r.isActive,
          userTotalDeals: user?.totalDeals || 0,
          userSuccessfulDeals: user?.successfulDeals || 0,
        };
      }),
      recentEarnings: recentEarnings.map(e => ({
        id: e.id,
        dealId: e.dealId,
        dealReference: e.deal?.referenceNumber,
        dealStatus: e.deal?.status,
        dealAmount: e.dealAmount.toString(),
        platformFee: e.platformFee.toString(),
        earning: e.earning.toString(),
        createdAt: e.createdAt,
      })),
    };
  }

  async getMyReferrals(userId: string, page = 1, limit = 20) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.referral.count({
      where: { referrerId: userId },
    });

    const referredUserIds = referrals.map(r => r.referredUserId);
    const referredUsers = await this.prisma.user.findMany({
      where: { id: { in: referredUserIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        telegramUsername: true,
        photoUrl: true,
        createdAt: true,
        totalDeals: true,
        successfulDeals: true,
        lastActiveAt: true,
      },
    });

    const userMap = new Map(referredUsers.map(u => [u.id, u]));

    return {
      items: referrals.map(r => {
        const user = userMap.get(r.referredUserId);
        return {
          id: r.id,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.telegramUsername,
            photoUrl: user.photoUrl,
            joinedAt: user.createdAt,
            lastActiveAt: user.lastActiveAt,
            totalDeals: user.totalDeals,
            successfulDeals: user.successfulDeals,
          } : null,
          dealCount: r.dealCount,
          totalEarned: r.totalEarned.toString(),
          isActive: r.isActive,
          createdAt: r.createdAt,
        };
      }),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getEarnings(userId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.referralEarning.findMany({
        where: { referral: { referrerId: userId } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          deal: {
            select: {
              id: true,
              referenceNumber: true,
              status: true,
            },
          },
          referral: {
            select: {
              referredUserId: true,
            },
          },
        },
      }),
      this.prisma.referralEarning.count({
        where: { referral: { referrerId: userId } },
      }),
    ]);

    const referredUserIds = items.map(e => e.referral.referredUserId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: referredUserIds } },
      select: { id: true, firstName: true, telegramUsername: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return {
      items: items.map(e => {
        const user = userMap.get(e.referral.referredUserId);
        return {
          id: e.id,
          dealId: e.dealId,
          dealReference: e.deal?.referenceNumber,
          dealStatus: e.deal?.status,
          referredUserName: user?.firstName || 'User',
          referredUsername: user?.telegramUsername,
          dealAmount: e.dealAmount.toString(),
          platformFee: e.platformFee.toString(),
          earning: e.earning.toString(),
          createdAt: e.createdAt,
        };
      }),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}
