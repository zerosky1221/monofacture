import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformStats() {
    const totalFees = await this.prisma.escrow.aggregate({
      where: { status: 'RELEASED' },
      _sum: { platformFee: true },
      _count: true,
    });

    const totalPayouts = await this.prisma.userBalance.aggregate({
      _sum: {
        totalEarned: true,
        totalWithdrawn: true,
        totalReferral: true,
      },
    });

    const pendingWithdrawals = await this.prisma.withdrawal.aggregate({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
      _sum: { netAmount: true },
      _count: true,
    });

    const recentDeals = await this.prisma.deal.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 20,
      include: {
        escrow: { select: { platformFee: true, totalAmount: true } },
        advertiser: { select: { firstName: true, telegramUsername: true } },
        channelOwner: { select: { firstName: true, telegramUsername: true } },
      },
    });

    return {
      totalDealsCompleted: totalFees._count,
      totalPlatformFees: (totalFees._sum.platformFee || 0n).toString(),
      totalPublisherEarnings: (totalPayouts._sum.totalEarned || 0n).toString(),
      totalWithdrawn: (totalPayouts._sum.totalWithdrawn || 0n).toString(),
      totalReferralPaid: (totalPayouts._sum.totalReferral || 0n).toString(),
      pendingWithdrawalsCount: pendingWithdrawals._count,
      pendingWithdrawalsAmount: (pendingWithdrawals._sum.netAmount || 0n).toString(),
      platformNetRevenue: (
        (totalFees._sum.platformFee || 0n) - (totalPayouts._sum.totalReferral || 0n)
      ).toString(),
      recentDeals: recentDeals.map(d => ({
        id: d.id,
        referenceNumber: d.referenceNumber,
        completedAt: d.completedAt,
        totalAmount: d.escrow?.totalAmount?.toString() || '0',
        platformFee: d.escrow?.platformFee?.toString() || '0',
        advertiser: d.advertiser?.telegramUsername || d.advertiser?.firstName,
        publisher: d.channelOwner?.telegramUsername || d.channelOwner?.firstName,
      })),
    };
  }

  async getRevenueBreakdown(period: 'day' | 'week' | 'month' = 'month') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const completedDeals = await this.prisma.deal.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: startDate },
      },
      include: {
        escrow: { select: { platformFee: true, totalAmount: true } },
      },
    });

    const totalVolume = completedDeals.reduce(
      (sum, d) => sum + (d.escrow?.totalAmount || 0n), 0n,
    );
    const totalFees = completedDeals.reduce(
      (sum, d) => sum + (d.escrow?.platformFee || 0n), 0n,
    );

    return {
      period,
      startDate,
      endDate: now,
      dealsCount: completedDeals.length,
      totalVolume: totalVolume.toString(),
      totalFees: totalFees.toString(),
      averageDealSize: completedDeals.length > 0
        ? (totalVolume / BigInt(completedDeals.length)).toString()
        : '0',
    };
  }
}
