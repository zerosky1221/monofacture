import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { DealStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReview(
    userId: string,
    data: {
      dealId: string;
      rating: number;
      communicationRating?: number;
      qualityRating?: number;
      timelinessRating?: number;
      comment?: string;
      tags?: string[];
    },
  ) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: data.dealId },
      select: {
        id: true,
        status: true,
        advertiserId: true,
        channelOwnerId: true,
        channelId: true,
      },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    if (deal.status !== DealStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed deals');
    }

    const isAdvertiser = deal.advertiserId === userId;
    const isChannelOwner = deal.channelOwnerId === userId;

    if (!isAdvertiser && !isChannelOwner) {
      throw new ForbiddenException('You are not a participant of this deal');
    }

    const recipientId = isAdvertiser ? deal.channelOwnerId : deal.advertiserId;

    const existing = await this.prisma.review.findUnique({
      where: { dealId_authorId: { dealId: data.dealId, authorId: userId } },
    });

    if (existing) {
      throw new BadRequestException('You have already reviewed this deal');
    }

    const review = await this.prisma.review.create({
      data: {
        dealId: data.dealId,
        authorId: userId,
        recipientId,
        channelId: deal.channelId,
        rating: data.rating,
        communicationRating: data.communicationRating,
        qualityRating: data.qualityRating,
        timelinessRating: data.timelinessRating,
        comment: data.comment,
        tags: data.tags || [],
        isVerified: true,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true, telegramUsername: true },
        },
      },
    });

    await this.recalculateUserRating(recipientId);

    this.logger.log(`Review created: ${review.id} for deal ${data.dealId} by user ${userId}`);

    return review;
  }

  async getUserReviews(
    userId: string,
    page = 1,
    limit = 20,
    sort: 'newest' | 'oldest' | 'highest' | 'lowest' = 'newest',
  ) {
    const orderBy = {
      newest: { createdAt: 'desc' as const },
      oldest: { createdAt: 'asc' as const },
      highest: { rating: 'desc' as const },
      lowest: { rating: 'asc' as const },
    }[sort];

    const where = { recipientId: userId, isPublic: true };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true, telegramUsername: true },
          },
          deal: {
            select: { id: true, referenceNumber: true, adFormat: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    const stats = await this.getUserStats(userId);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      averageRating: stats.averageRating,
      ratingDistribution: stats.ratingDistribution,
    };
  }

  async getMyGivenReviews(userId: string, page = 1, limit = 20) {
    const where = { authorId: userId };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          recipient: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true, telegramUsername: true },
          },
          deal: {
            select: { id: true, referenceNumber: true, adFormat: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getMyReceivedReviews(userId: string, page = 1, limit = 20) {
    const where = { recipientId: userId };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true, telegramUsername: true },
          },
          deal: {
            select: { id: true, referenceNumber: true, adFormat: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getDealReviews(dealId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { dealId },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true, telegramUsername: true },
        },
        recipient: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true, telegramUsername: true },
        },
      },
    });

    return reviews;
  }

  async getPendingReviews(userId: string) {
    const completedDeals = await this.prisma.deal.findMany({
      where: {
        status: DealStatus.COMPLETED,
        OR: [{ advertiserId: userId }, { channelOwnerId: userId }],
      },
      select: {
        id: true,
        referenceNumber: true,
        adFormat: true,
        completedAt: true,
        advertiserId: true,
        channelOwnerId: true,
        channel: {
          select: { id: true, title: true, username: true },
        },
        reviews: {
          where: { authorId: userId },
          select: { id: true },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    const pending = completedDeals
      .filter((d) => d.reviews.length === 0)
      .map((d) => ({
        id: d.id,
        referenceNumber: d.referenceNumber,
        adFormat: d.adFormat,
        completedAt: d.completedAt,
        channel: d.channel,
        recipientId: d.advertiserId === userId ? d.channelOwnerId : d.advertiserId,
      }));

    return pending;
  }

  async replyToReview(reviewId: string, userId: string, reply: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.recipientId !== userId) {
      throw new ForbiddenException('Only the recipient can reply to a review');
    }

    if (review.response) {
      throw new BadRequestException('You have already replied to this review');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        response: reply,
        respondedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true, telegramUsername: true },
        },
      },
    });

    return updated;
  }

  async getUserStats(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { recipientId: userId, isPublic: true },
      select: { rating: true, tags: true },
    });

    const total = reviews.length;
    const avgRating =
      total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    const tagCounts: Record<string, number> = {};
    reviews.forEach((r) => {
      r.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, count }));

    return {
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: total,
      ratingDistribution: distribution,
      topTags,
    };
  }

  private async recalculateUserRating(userId: string) {
    const stats = await this.prisma.review.aggregate({
      where: { recipientId: userId, isPublic: true },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        rating: stats._avg.rating || 0,
        reviewCount: stats._count,
      },
    });
  }
}
