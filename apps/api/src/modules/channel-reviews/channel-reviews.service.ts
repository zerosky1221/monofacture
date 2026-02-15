import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { DealStatus } from '@prisma/client';
import { CreateChannelReviewDto } from './dto/create-channel-review.dto';

@Injectable()
export class ChannelReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateChannelReviewDto) {

    const deal = await this.prisma.deal.findUnique({
      where: { id: dto.dealId },
      select: { id: true, status: true, advertiserId: true, channelId: true },
    });

    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.status !== DealStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed deals');
    }
    if (deal.advertiserId !== userId) {
      throw new ForbiddenException('Only the advertiser can leave a channel review');
    }
    if (deal.channelId !== dto.channelId) {
      throw new BadRequestException('Channel does not match the deal');
    }

    const existing = await this.prisma.channelReview.findUnique({
      where: { dealId_fromUserId: { dealId: dto.dealId, fromUserId: userId } },
    });
    if (existing) {
      throw new BadRequestException('You already reviewed this channel for this deal');
    }

    const review = await this.prisma.$transaction(async (prisma) => {
      const created = await prisma.channelReview.create({
        data: {
          dealId: dto.dealId,
          channelId: dto.channelId,
          fromUserId: userId,
          overallRating: dto.overallRating,
          audienceQuality: dto.audienceQuality,
          engagementRating: dto.engagementRating,
          reachAccuracy: dto.reachAccuracy,
          comment: dto.comment,
          tags: dto.tags || [],
        },
        include: {
          fromUser: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true, telegramUsername: true },
          },
          deal: {
            select: { id: true, referenceNumber: true, adFormat: true },
          },
        },
      });

      const agg = await prisma.channelReview.aggregate({
        where: { channelId: dto.channelId },
        _avg: { overallRating: true },
        _count: { id: true },
      });

      await prisma.channel.update({
        where: { id: dto.channelId },
        data: {
          channelRating: agg._avg.overallRating || 0,
          channelReviewCount: agg._count.id,
        },
      });

      return created;
    });

    return review;
  }

  async getChannelReviews(channelId: string, page = 1, limit = 20, sort: string = 'newest') {
    const orderBy = sort === 'oldest'
      ? { createdAt: 'asc' as const }
      : sort === 'highest'
        ? { overallRating: 'desc' as const }
        : sort === 'lowest'
          ? { overallRating: 'asc' as const }
          : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.channelReview.findMany({
        where: { channelId },
        include: {
          fromUser: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true, telegramUsername: true },
          },
          deal: {
            select: { id: true, referenceNumber: true, adFormat: true },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.channelReview.count({ where: { channelId } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getChannelStats(channelId: string) {
    const reviews = await this.prisma.channelReview.findMany({
      where: { channelId },
      select: { overallRating: true, tags: true },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        topTags: [],
      };
    }

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const tagCounts: Record<string, number> = {};
    let sum = 0;

    for (const r of reviews) {
      sum += r.overallRating;
      distribution[r.overallRating] = (distribution[r.overallRating] || 0) + 1;
      for (const tag of r.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    return {
      averageRating: sum / reviews.length,
      totalReviews: reviews.length,
      ratingDistribution: distribution,
      topTags,
    };
  }

  async getMyChannelReviews(userId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.channelReview.findMany({
        where: { fromUserId: userId },
        include: {
          channel: {
            select: { id: true, title: true, username: true, photoUrl: true },
          },
          deal: {
            select: { id: true, referenceNumber: true, adFormat: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.channelReview.count({ where: { fromUserId: userId } }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
