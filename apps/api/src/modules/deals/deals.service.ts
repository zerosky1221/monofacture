import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import {
  Deal,
  DealStatus,
  CreativeStatus,
  PostStatus,
  Prisma,
} from '@prisma/client';
import { DealStateMachine } from './deal-state-machine';
import { EscrowService } from '../escrow/escrow.service';
import { AchievementsService } from '../achievements/achievements.service';
import { LeaderboardService } from '../achievements/leaderboard.service';
import {
  CreateDealDto,
  UpdateDealDto,
  SubmitCreativeDto,
  DealFiltersDto,
} from './dto/deals.dto';
import { createPaginatedResponse, PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { generateReferenceNumber, QUEUES, CACHE_TTL } from '@telegram-ads/shared';
import { PricingService } from '../pricing/pricing.service';
import { PostingService } from '../posting/posting.service';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly stateMachine: DealStateMachine,
    private readonly pricingService: PricingService,
    @Inject(forwardRef(() => EscrowService))
    private readonly escrowService: EscrowService,
    @Inject(forwardRef(() => PostingService))
    private readonly postingService: PostingService,
    @InjectQueue(QUEUES.DEAL_TIMEOUT) private readonly timeoutQueue: Queue,
    @Inject(forwardRef(() => AchievementsService))
    private readonly achievementsService: AchievementsService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  async create(advertiserId: string, dto: CreateDealDto): Promise<Deal> {

    const channel = await this.prisma.channel.findUnique({
      where: { id: dto.channelId },
      include: {
        pricing: {
          where: { adFormat: dto.adFormat, isActive: true },
        },
        owner: true,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.status !== 'ACTIVE' && channel.status !== 'VERIFIED') {
      throw new BadRequestException('Channel is not active');
    }

    if (!channel.isActive) {
      throw new BadRequestException('Channel is deactivated');
    }

    if (!channel.isAcceptingOrders) {
      throw new BadRequestException('Channel is not accepting orders');
    }

    if (channel.ownerId === advertiserId) {
      throw new BadRequestException('Cannot create deal with your own channel');
    }

    const pricing = channel.pricing[0];
    if (!pricing) {
      throw new BadRequestException(`No pricing set for ${dto.adFormat} on this channel`);
    }

    const isPermanent = dto.isPermanent || false;
    let price: bigint;
    let platformFee: bigint;
    let totalAmount: bigint;
    let duration: number | null;

    if (isPermanent) {
      if (!pricing.pricePermanent) {
        throw new BadRequestException('This channel does not offer permanent placements for this format');
      }
      const priceCalc = this.pricingService.calculatePermanentPrice(pricing.pricePermanent);
      price = priceCalc.subtotal;
      platformFee = priceCalc.platformFee;
      totalAmount = priceCalc.totalAmount;
      duration = null;
    } else {
      duration = dto.postDuration || pricing.minHours || 24;
      const priceCalc = this.pricingService.calculateHourlyPrice(
        pricing.pricePerHour,
        duration,
        pricing.minHours,
        pricing.maxHours,
      );
      price = priceCalc.subtotal;
      platformFee = priceCalc.platformFee;
      totalAmount = priceCalc.totalAmount;
    }

    if (dto.scheduledPostTime) {
      this.pricingService.validatePublishTime(
        new Date(dto.scheduledPostTime),
        pricing.publishTimeStart,
        pricing.publishTimeEnd,
        pricing.timezone,
      );
    }

    const referenceNumber = generateReferenceNumber();

    const deal = await this.prisma.$transaction(async (prisma) => {
      const createdDeal = await prisma.deal.create({
        data: {
          referenceNumber,
          advertiserId,
          channelOwnerId: channel.ownerId,
          channelId: dto.channelId,
          campaignId: dto.campaignId,
          adFormat: dto.adFormat,
          price,
          platformFee,
          totalAmount,
          brief: dto.brief,
          requirements: dto.requirements,
          scheduledPostTime: dto.scheduledPostTime ? new Date(dto.scheduledPostTime) : null,
          postDuration: duration,
          isPermanent,
          status: DealStatus.CREATED,
          timeoutMinutes: this.configService.get<number>('platform.defaultDealTimeoutHours', 24) * 60,
          isAnonymous: dto.isAnonymous || false,
        },
      });

      await prisma.dealTimeline.create({
        data: {
          dealId: createdDeal.id,
          event: 'deal_created',
          toStatus: DealStatus.CREATED,
          actorId: advertiserId,
          actorType: 'USER',
        },
      });

      return createdDeal;
    });

    await this.scheduleTimeoutCheck(deal.id, deal.timeoutMinutes);

    this.logger.log(`Deal created: ${deal.referenceNumber}`);

    return deal;
  }

  async findById(id: string): Promise<Deal> {
    const cacheKey = `deal:${id}`;
    const cached = await this.redisService.get<Deal>(cacheKey);
    if (cached) {
      return cached;
    }

    const deal = await this.prisma.deal.findUnique({
      where: { id },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    await this.redisService.set(cacheKey, deal, CACHE_TTL.DEAL);

    return deal;
  }

  async getDealDetails(id: string, userId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        advertiser: {
          select: {
            id: true,
            telegramUsername: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            rating: true,
            reviewCount: true,
          },
        },
        channelOwner: {
          select: {
            id: true,
            telegramUsername: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            rating: true,
            reviewCount: true,
          },
        },
        channel: {
          select: {
            id: true,
            title: true,
            username: true,
            photoUrl: true,
            subscriberCount: true,
          },
        },
        escrow: true,
        creative: true,
        timeline: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        publishedPosts: {
          select: {
            id: true,
            telegramMessageId: true,
            publishedAt: true,
            scheduledDeleteAt: true,
            deletedAt: true,
            status: true,
          },
          orderBy: { publishedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    if (deal.advertiserId !== userId && deal.channelOwnerId !== userId) {
      throw new ForbiddenException('You are not a party to this deal');
    }

    if (deal.isAnonymous && deal.channelOwnerId === userId && deal.advertiserId !== userId) {
      return {
        ...deal,
        advertiser: {
          id: deal.advertiserId,
          telegramUsername: null,
          firstName: 'Anonymous',
          lastName: 'Advertiser',
          photoUrl: null,
          rating: 0,
          reviewCount: 0,
        },
      };
    }

    return deal;
  }

  async accept(id: string, userId: string): Promise<Deal> {
    const deal = await this.findById(id);

    if (deal.channelOwnerId !== userId) {
      throw new ForbiddenException('Only channel owner can accept deals');
    }

    const updatedDeal = await this.stateMachine.accept(id, userId);

    try {
      await this.escrowService.createEscrow(id);
    } catch (error) {
      this.logger.warn(`Escrow creation failed during accept, will retry on payment: ${(error as Error).message}`);
    }

    await this.redisService.del(`deal:${id}`);

    return updatedDeal;
  }

  async reject(id: string, userId: string, reason?: string): Promise<Deal> {
    const deal = await this.findById(id);

    if (deal.channelOwnerId !== userId) {
      throw new ForbiddenException('Only channel owner can reject deals');
    }

    const updatedDeal = await this.stateMachine.reject(id, userId, reason);
    await this.redisService.del(`deal:${id}`);

    return updatedDeal;
  }

  async cancel(id: string, userId: string, reason?: string): Promise<Deal> {
    const deal = await this.findById(id);

    const role = deal.advertiserId === userId ? 'advertiser' :
                 deal.channelOwnerId === userId ? 'channel_owner' : null;

    if (!role) {
      throw new ForbiddenException('You are not a party to this deal');
    }

    const cancellableStatuses: DealStatus[] = [
      DealStatus.CREATED,
      DealStatus.PENDING_PAYMENT,
      DealStatus.CREATIVE_PENDING,
    ];

    if (!cancellableStatuses.includes(deal.status)) {
      throw new BadRequestException('Deal cannot be cancelled at this stage');
    }

    const updatedDeal = await this.stateMachine.cancel(id, userId, role, reason);

    if (deal.status === DealStatus.PENDING_PAYMENT || deal.status === DealStatus.CREATIVE_PENDING) {
      try {
        await this.escrowService.refundAdvertiser(id, 'Deal cancelled');
      } catch (error) {
        this.logger.warn(`Failed to refund escrow: ${(error as Error).message}`);
      }
    }

    await this.redisService.del(`deal:${id}`);

    return updatedDeal;
  }

  async submitCreative(id: string, userId: string, dto: SubmitCreativeDto): Promise<Deal> {
    const deal = await this.findById(id);

    if (deal.channelOwnerId !== userId) {
      throw new ForbiddenException('Only channel owner can submit creative');
    }

    await this.prisma.dealCreative.upsert({
      where: { dealId: id },
      create: {
        dealId: id,
        text: dto.text,
        mediaUrls: dto.mediaUrls || [],
        buttons: dto.buttons as unknown as Prisma.InputJsonValue,
        status: CreativeStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      update: {
        text: dto.text,
        mediaUrls: dto.mediaUrls || [],
        buttons: dto.buttons as unknown as Prisma.InputJsonValue,
        status: CreativeStatus.SUBMITTED,
        submittedAt: new Date(),
        version: { increment: 1 },
      },
    });

    const updatedDeal = await this.stateMachine.submitCreative(id, userId);
    await this.redisService.del(`deal:${id}`);

    return updatedDeal;
  }

  async approveCreative(id: string, userId: string): Promise<Deal> {

    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        channel: true,
        creative: true,
      },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    if (deal.advertiserId !== userId) {
      throw new ForbiddenException('Only advertiser can approve creative');
    }

    if (!deal.creative) {
      throw new BadRequestException('No creative submitted for this deal');
    }

    await this.prisma.dealCreative.update({
      where: { dealId: id },
      data: {
        status: CreativeStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    await this.stateMachine.approveCreative(id, userId);

    const now = new Date();
    const scheduledTime = deal.scheduledPostTime;
    const MIN_DELAY_MS = 2 * 60 * 1000;

    if (scheduledTime && scheduledTime.getTime() > now.getTime() + MIN_DELAY_MS) {

      this.logger.log(`Deal ${id}: Scheduling post for ${scheduledTime.toISOString()}`);

      await this.postingService.schedulePost({
        dealId: id,
        scheduledFor: scheduledTime,
        content: deal.creative.text || '',
        mediaUrls: deal.creative.mediaUrls as string[],
        buttons: deal.creative.buttons as Array<{ text: string; url: string }>,
      });

    } else {

      this.logger.log(`Deal ${id}: Publishing immediately (ASAP mode or time passed)`);


      const publishedPost = await this.prisma.publishedPost.create({
        data: {
          dealId: id,
          channelId: deal.channelId,
          content: deal.creative.text || '',
          mediaUrls: deal.creative.mediaUrls || [],
          buttons: deal.creative.buttons || [],
          status: PostStatus.PUBLISHING,
        },
      });

      try {
        await this.postingService.publishPost(publishedPost.id);
      } catch (error) {
        this.logger.error(`Failed to publish post for deal ${id}: ${(error as Error).message}`);

      }
    }

    await this.redisService.del(`deal:${id}`);

    return this.findById(id);
  }

  async requestRevision(id: string, userId: string, feedback: string): Promise<Deal> {
    const deal = await this.findById(id);

    if (deal.advertiserId !== userId) {
      throw new ForbiddenException('Only advertiser can request revisions');
    }

    await this.prisma.dealCreative.update({
      where: { dealId: id },
      data: {
        status: CreativeStatus.REJECTED,
        rejectedAt: new Date(),
        revisionRequests: { push: feedback },
      },
    });

    const updatedDeal = await this.stateMachine.requestRevision(id, userId, feedback);
    await this.redisService.del(`deal:${id}`);

    return updatedDeal;
  }

  async findAll(userId: string, filters: DealFiltersDto): Promise<PaginatedResponseDto<Deal>> {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.DealWhereInput = {};

    if (role === 'advertiser') {
      where.advertiserId = userId;
    } else if (role === 'channel_owner') {
      where.channelOwnerId = userId;
    } else {
      where.OR = [
        { advertiserId: userId },
        { channelOwnerId: userId },
      ];
    }

    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: status };
      } else {
        where.status = status;
      }
    }

    const [deals, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        include: {
          channel: {
            select: {
              id: true,
              title: true,
              username: true,
              photoUrl: true,
            },
          },
          advertiser: {
            select: {
              id: true,
              firstName: true,
              telegramUsername: true,
            },
          },
          channelOwner: {
            select: {
              id: true,
              firstName: true,
              telegramUsername: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deal.count({ where }),
    ]);

    const processedDeals = deals.map((deal) => {
      if (deal.isAnonymous && deal.channelOwnerId === userId && deal.advertiserId !== userId) {
        return {
          ...deal,
          advertiser: {
            id: deal.advertiserId,
            firstName: 'Anonymous',
            telegramUsername: null,
          },
        };
      }
      return deal;
    });

    return createPaginatedResponse(processedDeals, total, page, limit);
  }

  async getTimeline(id: string, userId: string) {
    const deal = await this.findById(id);

    if (deal.advertiserId !== userId && deal.channelOwnerId !== userId) {
      throw new ForbiddenException('You are not a party to this deal');
    }

    return this.prisma.dealTimeline.findMany({
      where: { dealId: id },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            telegramUsername: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async scheduleTimeoutCheck(dealId: string, timeoutMinutes: number): Promise<void> {
    await this.timeoutQueue.add(
      'check-timeout',
      { dealId },
      {
        delay: timeoutMinutes * 60 * 1000,
        removeOnComplete: true,
      },
    );
  }

  async checkTimeout(dealId: string): Promise<void> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) return;

    const timeoutableStatuses: DealStatus[] = [
      DealStatus.CREATED,
      DealStatus.PENDING_PAYMENT,
      DealStatus.CREATIVE_PENDING,
    ];

    if (!timeoutableStatuses.includes(deal.status)) {
      return;
    }

    const now = new Date();
    const lastActivity = deal.lastActivityAt || deal.createdAt;
    const timeoutMs = deal.timeoutMinutes * 60 * 1000;

    if (now.getTime() - lastActivity.getTime() >= timeoutMs) {
      this.logger.log(`Deal ${dealId} timed out`);
      await this.stateMachine.expire(dealId);
      await this.redisService.del(`deal:${dealId}`);
    }
  }

  async confirmPost(id: string, userId: string, postUrl?: string): Promise<Deal> {
    const deal = await this.findById(id);

    if (deal.channelOwnerId !== userId) {
      throw new ForbiddenException('Only channel owner can confirm posting');
    }

    const updatedDeal = await this.stateMachine.confirmPosted(id, userId, postUrl);

    await this.redisService.del(`deal:${id}`);
    return updatedDeal;
  }

  async confirmCompletion(id: string, userId: string): Promise<Deal> {
    const deal = await this.findById(id);

    if (deal.advertiserId !== userId) {
      throw new ForbiddenException('Only advertiser can confirm completion');
    }

    if (deal.status !== DealStatus.POSTED) {
      throw new BadRequestException('Deal must be in POSTED status to confirm completion');
    }

    try {
      await this.escrowService.releaseFunds(id);
      this.logger.log(`Escrow released and deal completed for ${id}`);
    } catch (error) {
      this.logger.error(`Failed to release escrow for deal ${id}: ${(error as Error).message}`);
      throw new BadRequestException(`Failed to release escrow: ${(error as Error).message}`);
    }

    await this.redisService.del(`deal:${id}`);

    const completedDeal = await this.findById(id);
    this.achievementsService.checkAndAwardAll(completedDeal.advertiserId).then(() =>
      this.leaderboardService.recalculateUserXp(completedDeal.advertiserId),
    ).catch(err => {
      this.logger.error(`Achievement check failed for advertiser ${completedDeal.advertiserId}`, err);
    });
    this.achievementsService.checkAndAwardAll(completedDeal.channelOwnerId).then(() =>
      this.leaderboardService.recalculateUserXp(completedDeal.channelOwnerId),
    ).catch(err => {
      this.logger.error(`Achievement check failed for channel owner ${completedDeal.channelOwnerId}`, err);
    });

    return completedDeal;
  }

  async getCalendarDeals(userId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return this.prisma.deal.findMany({
      where: {
        AND: [
          {
            OR: [
              { advertiserId: userId },
              { channel: { ownerId: userId } },
            ],
          },
          {
            OR: [
              { scheduledPostTime: { gte: startDate, lte: endDate } },
              { AND: [{ scheduledPostTime: null }, { createdAt: { gte: startDate, lte: endDate } }] },
            ],
          },
        ],
      },
      include: { channel: { select: { title: true, username: true } } },
      orderBy: { scheduledPostTime: 'asc' },
    });
  }

  async getDealsForUser(userId: string, role?: 'advertiser' | 'channel_owner') {
    const where: Prisma.DealWhereInput = role === 'advertiser'
      ? { advertiserId: userId }
      : role === 'channel_owner'
      ? { channelOwnerId: userId }
      : { OR: [{ advertiserId: userId }, { channelOwnerId: userId }] };

    return this.prisma.deal.findMany({
      where,
      include: {
        channel: {
          select: { id: true, title: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getDealById(id: string): Promise<Deal> {
    return this.findById(id);
  }

  async acceptDeal(id: string, userId: string): Promise<Deal> {
    return this.accept(id, userId);
  }

  async rejectDeal(id: string, userId: string, reason?: string): Promise<Deal> {
    return this.reject(id, userId, reason);
  }

  async createDeal(advertiserId: string, dto: CreateDealDto): Promise<Deal> {
    return this.create(advertiserId, dto);
  }
}
