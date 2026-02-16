import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getPublisherOverview(userId: string) {
    const channels = await this.prisma.channel.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const channelIds = channels.map(c => c.id);

    const [completedDeals, totalEarnings] = await Promise.all([
      this.prisma.deal.count({ where: { channelId: { in: channelIds }, status: 'COMPLETED' } }),
      this.prisma.balanceTransaction.aggregate({
        where: { balance: { userId }, type: 'DEAL_EARNING' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalChannels: channelIds.length,
      totalDeals: completedDeals,
      totalEarnings: totalEarnings._sum.amount?.toString() || '0',
    };
  }

  async getEarningsChart(userId: string, period: '7d' | '30d' | '90d') {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await this.prisma.balanceTransaction.findMany({
      where: {
        balance: { userId },
        type: 'DEAL_EARNING',
        createdAt: { gte: startDate },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = new Map<string, bigint>();
    transactions.forEach(tx => {
      const date = tx.createdAt.toISOString().split('T')[0];
      grouped.set(date, (grouped.get(date) || BigInt(0)) + tx.amount);
    });

    return Array.from(grouped.entries()).map(([date, amount]) => ({
      date,
      amount: amount.toString(),
    }));
  }

  async getDealsByFormat(userId: string) {
    const channels = await this.prisma.channel.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const channelIds = channels.map(c => c.id);

    const deals = await this.prisma.deal.groupBy({
      by: ['adFormat'],
      where: { channelId: { in: channelIds }, status: 'COMPLETED' },
      _count: true,
      _sum: { totalAmount: true },
    });

    return deals.map(d => ({
      format: d.adFormat,
      count: d._count,
      earnings: d._sum.totalAmount?.toString() || '0',
    }));
  }

  async getTopAdvertisers(userId: string, limit = 5) {
    const channels = await this.prisma.channel.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const channelIds = channels.map(c => c.id);

    const advertisers = await this.prisma.deal.groupBy({
      by: ['advertiserId'],
      where: { channelId: { in: channelIds }, status: 'COMPLETED' },
      _count: true,
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: limit,
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: advertisers.map(a => a.advertiserId) } },
      select: { id: true, firstName: true, telegramUsername: true, photoUrl: true },
    });

    return advertisers.map(a => {
      const user = users.find(u => u.id === a.advertiserId);
      return { user, dealsCount: a._count, totalSpent: a._sum.totalAmount?.toString() || '0' };
    });
  }

  async getDashboard(userId: string, period: '7d' | '30d' | '90d') {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const channels = await this.prisma.channel.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        title: true,
        username: true,
        photoUrl: true,
        subscriberCount: true,
        averageViews: true,
        totalEarnings: true,
        totalDeals: true,
        rating: true,
      },
    });
    const channelIds = channels.map(c => c.id);

    const [
      completedDeals,
      totalEarningsAgg,
      earningsTransactions,
      formatBreakdown,
      advertiserGroups,
      perChannelDeals,
    ] = await Promise.all([
      this.prisma.deal.count({
        where: {
          channelId: { in: channelIds },
          status: 'COMPLETED',
          updatedAt: { gte: startDate },
        },
      }),
      this.prisma.balanceTransaction.aggregate({
        where: {
          balance: { userId },
          type: 'DEAL_EARNING',
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.balanceTransaction.findMany({
        where: {
          balance: { userId },
          type: 'DEAL_EARNING',
          createdAt: { gte: startDate },
        },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.deal.groupBy({
        by: ['adFormat'],
        where: {
          channelId: { in: channelIds },
          status: 'COMPLETED',
          updatedAt: { gte: startDate },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.deal.groupBy({
        by: ['advertiserId'],
        where: {
          channelId: { in: channelIds },
          status: 'COMPLETED',
          updatedAt: { gte: startDate },
        },
        _count: true,
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
      this.prisma.deal.groupBy({
        by: ['channelId'],
        where: {
          channelId: { in: channelIds },
          status: 'COMPLETED',
          updatedAt: { gte: startDate },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
    ]);

    const grouped = new Map<string, bigint>();
    earningsTransactions.forEach(tx => {
      const date = tx.createdAt.toISOString().split('T')[0];
      grouped.set(date, (grouped.get(date) || BigInt(0)) + tx.amount);
    });
    const earningsChart = Array.from(grouped.entries()).map(([date, amount]) => ({
      date,
      amount: amount.toString(),
    }));

    const advertiserUsers = advertiserGroups.length
      ? await this.prisma.user.findMany({
          where: { id: { in: advertiserGroups.map(a => a.advertiserId) } },
          select: { id: true, firstName: true, telegramUsername: true, photoUrl: true },
        })
      : [];

    const topAdvertisers = advertiserGroups.map(a => {
      const user = advertiserUsers.find(u => u.id === a.advertiserId);
      return {
        user,
        dealsCount: a._count,
        totalSpent: a._sum.totalAmount?.toString() || '0',
      };
    });

    const channelDealMap = new Map(perChannelDeals.map(d => [d.channelId, d]));
    const channelStats = channels.map(ch => ({
      id: ch.id,
      title: ch.title,
      username: ch.username,
      photoUrl: ch.photoUrl,
      subscriberCount: ch.subscriberCount,
      averageViews: ch.averageViews,
      rating: ch.rating,
      dealsInPeriod: channelDealMap.get(ch.id)?._count || 0,
      earningsInPeriod: channelDealMap.get(ch.id)?._sum.totalAmount?.toString() || '0',
    }));

    const avgRating =
      channels.length > 0
        ? channels.reduce((sum, ch) => sum + ch.rating, 0) / channels.length
        : 0;

    return {
      totalEarnings: totalEarningsAgg._sum.amount?.toString() || '0',
      totalDeals: completedDeals,
      totalChannels: channels.length,
      rating: Math.round(avgRating * 10) / 10,
      earningsChart,
      formatBreakdown: formatBreakdown.map(d => ({
        format: d.adFormat,
        count: d._count,
        earnings: d._sum.totalAmount?.toString() || '0',
      })),
      topAdvertisers,
      channelStats,
    };
  }

  async getAdvertiserOverview(userId: string) {
    const [totalDeals, activeDeals, totalSpent] = await Promise.all([
      this.prisma.deal.count({ where: { advertiserId: userId, status: 'COMPLETED' } }),
      this.prisma.deal.count({ where: { advertiserId: userId, status: { notIn: ['COMPLETED', 'CANCELLED', 'REFUNDED', 'EXPIRED'] } } }),
      this.prisma.deal.aggregate({ where: { advertiserId: userId, status: 'COMPLETED' }, _sum: { totalAmount: true } }),
    ]);

    return {
      totalDeals,
      activeDeals,
      totalSpent: totalSpent._sum.totalAmount?.toString() || '0',
    };
  }
}
