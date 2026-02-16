import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { Channel, ChannelStatus, ChannelPricing, ChannelCategory, Prisma, UserRole, AdFormat } from '@prisma/client';
import {
  CreateChannelDto,
  UpdateChannelDto,
  ChannelPricingDto,
  ChannelFiltersDto,
} from './dto/channels.dto';
import { createPaginatedResponse, PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { CACHE_TTL, EVENTS } from '@telegram-ads/shared';
import { ChannelStatsService } from './channel-stats.service';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly channelStatsService: ChannelStatsService,
  ) {}

  async create(userId: string, dto: CreateChannelDto): Promise<Channel> {

    const existing = await this.prisma.channel.findFirst({
      where: {
        OR: [
          { username: dto.username?.toLowerCase() },
          { telegramId: dto.telegramId ? BigInt(dto.telegramId) : undefined },
        ].filter(Boolean),
      },
    });

    if (existing) {
      if (existing.ownerId === userId) {
        throw new ConflictException('You have already registered this channel');
      }
      throw new ConflictException('This channel is already registered');
    }

    const verificationToken = this.generateVerificationToken();

    const channel = await this.prisma.channel.create({
      data: {
        telegramId: dto.telegramId ? BigInt(dto.telegramId) : BigInt(0),
        username: dto.username?.toLowerCase(),
        title: dto.title || 'Pending Verification',
        description: dto.description,
        photoUrl: dto.photoUrl,
        subscriberCount: dto.subscriberCount || 0,
        ownerId: userId,
        status: ChannelStatus.PENDING_VERIFICATION,
        verificationToken,
        categories: dto.categories || [],
        language: dto.language || 'en',
        isPublic: true,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          push: UserRole.CHANNEL_OWNER,
        },
      },
    });

    this.eventEmitter.emit(EVENTS.CHANNEL_CREATED, { channelId: channel.id, userId });

    return channel;
  }

  async verifyChannel(channelId: string, userId: string): Promise<Channel> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.ownerId !== userId) {
      throw new ForbiddenException('You are not the owner of this channel');
    }

    if (channel.status === ChannelStatus.VERIFIED || channel.status === ChannelStatus.ACTIVE) {
      return channel;
    }

    const updatedChannel = await this.prisma.channel.update({
      where: { id: channelId },
      data: {
        status: ChannelStatus.VERIFIED,
        verifiedAt: new Date(),
        isBotAdded: true,
        botAddedAt: new Date(),
      },
    });

    await this.channelStatsService.scheduleStatsUpdate(channelId);

    this.eventEmitter.emit(EVENTS.CHANNEL_VERIFIED, { channelId, userId });

    return updatedChannel;
  }

  async activateChannel(channelId: string, userId: string): Promise<Channel> {
    const channel = await this.findById(channelId);

    if (channel.ownerId !== userId) {
      throw new ForbiddenException('You are not the owner of this channel');
    }

    if (channel.status !== ChannelStatus.VERIFIED) {
      throw new BadRequestException('Channel must be verified first');
    }

    const hasPricing = await this.prisma.channelPricing.count({
      where: { channelId, isActive: true },
    });

    if (hasPricing === 0) {
      throw new BadRequestException('Please set pricing for at least one ad format');
    }

    return this.prisma.channel.update({
      where: { id: channelId },
      data: {
        status: ChannelStatus.ACTIVE,
        isActive: true,
      },
    });
  }

  async findById(id: string): Promise<Channel> {
    const cacheKey = `channel:${id}`;
    const cached = await this.redisService.get<Channel>(cacheKey);
    if (cached) {
      return cached;
    }

    const channel = await this.prisma.channel.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    await this.redisService.set(cacheKey, channel, CACHE_TTL.CHANNEL);

    return channel;
  }

  async getChannelDetails(id: string, viewerId?: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        owner: {
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
        pricing: {
          where: { isActive: true },
          orderBy: { pricePerHour: 'asc' },
        },
        stats: true,
        _count: {
          select: {
            deals: true,
            reviews: true,
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.isOwnerAnonymous && viewerId !== channel.ownerId) {
      return {
        ...channel,
        owner: {
          id: channel.owner.id,
          telegramUsername: null,
          firstName: 'Anonymous',
          lastName: null,
          photoUrl: null,
          rating: channel.owner.rating,
          reviewCount: channel.owner.reviewCount,
        },
      };
    }

    return channel;
  }

  async update(id: string, userId: string, dto: UpdateChannelDto): Promise<Channel> {
    const channel = await this.findById(id);

    if (channel.ownerId !== userId) {
      throw new ForbiddenException('You are not the owner of this channel');
    }

    let categories = dto.categories;
    if (dto.category && !categories) {

      const validCategories = Object.values(ChannelCategory);
      if (validCategories.includes(dto.category as ChannelCategory)) {
        categories = [dto.category as ChannelCategory];
      }
    }

    const updatedChannel = await this.prisma.channel.update({
      where: { id },
      data: {
        description: dto.description,
        categories: categories,
        tags: dto.tags,
        language: dto.language,
        isPublic: dto.isPublic,
        isOwnerAnonymous: dto.isOwnerAnonymous,
        isActive: dto.isActive,
        autoAcceptDeals: dto.autoAcceptDeals,
        isAcceptingOrders: dto.isAcceptingOrders,
        adRequirements: dto.adRequirements,
        minBudget: dto.minBudget ? BigInt(dto.minBudget) : undefined,
        maxBudget: dto.maxBudget ? BigInt(dto.maxBudget) : undefined,
      },
    });

    await this.redisService.del(`channel:${id}`);

    return updatedChannel;
  }

  async setPricing(channelId: string, userId: string, pricing: ChannelPricingDto[]): Promise<ChannelPricing[]> {
    const channel = await this.findById(channelId);

    if (channel.ownerId !== userId) {
      throw new ForbiddenException('You are not the owner of this channel');
    }

    const results = await Promise.all(
      pricing.map((p) =>
        this.prisma.channelPricing.upsert({
          where: {
            channelId_adFormat: {
              channelId,
              adFormat: p.adFormat,
            },
          },
          create: {
            channelId,
            adFormat: p.adFormat,
            pricePerHour: BigInt(p.pricePerHour),
            pricePermanent: p.pricePermanent ? BigInt(p.pricePermanent) : null,
            minHours: p.minHours ?? 1,
            maxHours: p.maxHours ?? 168,
            publishTimeStart: p.publishTimeStart ?? null,
            publishTimeEnd: p.publishTimeEnd ?? null,
            timezone: p.timezone ?? 'UTC',
            description: p.description,
            duration: p.duration,
            includes: p.includes || [],
            isActive: p.isActive ?? true,
          },
          update: {
            pricePerHour: BigInt(p.pricePerHour),
            pricePermanent: p.pricePermanent ? BigInt(p.pricePermanent) : null,
            minHours: p.minHours ?? 1,
            maxHours: p.maxHours ?? 168,
            publishTimeStart: p.publishTimeStart ?? null,
            publishTimeEnd: p.publishTimeEnd ?? null,
            timezone: p.timezone ?? 'UTC',
            description: p.description,
            duration: p.duration,
            includes: p.includes || [],
            isActive: p.isActive ?? true,
          },
        }),
      ),
    );

    return results;
  }

  async getPricing(channelId: string): Promise<ChannelPricing[]> {
    return this.prisma.channelPricing.findMany({
      where: { channelId },
      orderBy: { pricePerHour: 'asc' },
    });
  }

  async findAll(filters: ChannelFiltersDto): Promise<PaginatedResponseDto<Channel>> {
    const {
      page = 1,
      limit = 20,
      search,
      categories,
      language,
      minSubscribers,
      maxSubscribers,
      minPrice,
      maxPrice,
      adFormat,
      minRating,
      verified,
      sortBy = 'subscriberCount',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.ChannelWhereInput = {
      status: { in: [ChannelStatus.ACTIVE, ChannelStatus.VERIFIED] },
      isActive: true,
      isPublic: true,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    let filterCategories = categories;
    if (filters.category && (!filterCategories || filterCategories.length === 0)) {
      const validCategories = Object.values(ChannelCategory);
      if (validCategories.includes(filters.category as ChannelCategory)) {
        filterCategories = [filters.category as ChannelCategory];
      }
    }

    if (filterCategories && filterCategories.length > 0) {
      where.categories = { hasSome: filterCategories };
    }

    if (language) {
      where.language = language;
    }

    if (minSubscribers !== undefined) {
      where.subscriberCount = { ...where.subscriberCount as object, gte: minSubscribers };
    }

    if (maxSubscribers !== undefined) {
      where.subscriberCount = { ...where.subscriberCount as object, lte: maxSubscribers };
    }

    if (minRating !== undefined) {
      where.channelRating = { gte: minRating };
    }

    if (verified === true) {
      where.status = ChannelStatus.VERIFIED;

      delete where.isActive;
    }

    if (adFormat || minPrice !== undefined || maxPrice !== undefined) {
      where.pricing = {
        some: {
          isActive: true,
          ...(adFormat && { adFormat }),
          ...(minPrice !== undefined && { price: { gte: BigInt(minPrice) } }),
          ...(maxPrice !== undefined && { price: { lte: BigInt(maxPrice) } }),
        },
      };
    }

    const [channels, total] = await Promise.all([
      this.prisma.channel.findMany({
        where,
        include: {
          pricing: {
            where: { isActive: true },
            orderBy: { pricePerHour: 'asc' },
            take: 4,
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.channel.count({ where }),
    ]);

    return createPaginatedResponse(channels, total, page, limit);
  }

  async findByOwner(userId: string): Promise<Channel[]> {
    return this.prisma.channel.findMany({
      where: {
        ownerId: userId,
        status: {
          notIn: [ChannelStatus.SUSPENDED, ChannelStatus.REJECTED],
        },
      },
      include: {
        pricing: { where: { isActive: true } },
        stats: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const channel = await this.findById(id);

    if (channel.ownerId !== userId) {
      throw new ForbiddenException('You are not the owner of this channel');
    }

    const activeDeals = await this.prisma.deal.count({
      where: {
        channelId: id,
        status: {
          notIn: ['COMPLETED', 'CANCELLED', 'REFUNDED', 'EXPIRED'],
        },
      },
    });

    if (activeDeals > 0) {
      throw new BadRequestException('Cannot delete channel with active deals');
    }

    await this.prisma.channel.update({
      where: { id },
      data: {
        status: ChannelStatus.SUSPENDED,
        isActive: false,
        isPublic: false,
        isAcceptingOrders: false,
      },
    });

    await this.prisma.channelPricing.updateMany({
      where: { channelId: id },
      data: { isActive: false },
    });

    await this.redisService.del(`channel:${id}`);

    this.logger.log(`Channel ${id} removed from marketplace by owner ${userId}`);
  }

  private generateVerificationToken(): string {
    return require('crypto').randomBytes(16).toString('hex');
  }

  async getChannelsByOwner(userId: string): Promise<Channel[]> {
    return this.findByOwner(userId);
  }

  async getChannelById(id: string): Promise<Channel> {
    return this.findById(id);
  }

  async updateChannel(id: string, userId: string, dto: UpdateChannelDto): Promise<Channel> {
    return this.update(id, userId, dto);
  }

  async getChannelByTelegramId(telegramId: string): Promise<Channel | null> {
    return this.prisma.channel.findFirst({
      where: { telegramId: BigInt(telegramId) },
    });
  }

  async createChannel(userId: string, dto: CreateChannelDto): Promise<Channel> {
    return this.create(userId, dto);
  }
}
