import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { User, UserRole, Prisma } from '@prisma/client';
import { UpdateUserDto, ConnectWalletDto, UserFiltersDto } from './dto/users.dto';
import { createPaginatedResponse, PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { CACHE_TTL, EVENTS } from '@telegram-ads/shared';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findById(id: string): Promise<User> {

    const cacheKey = `user:${id}`;
    const cached = await this.redisService.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.redisService.set(cacheKey, user, CACHE_TTL.USER);

    return user;
  }

  async findByTelegramId(telegramId: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { telegramId },
    });
  }

  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        ownedChannels: {
          where: { status: { in: ['ACTIVE', 'VERIFIED'] } },
          select: {
            id: true,
            title: true,
            username: true,
            subscriberCount: true,
            photoUrl: true,
            rating: true,
          },
        },
        wallets: {
          select: {
            id: true,
            address: true,
            isMain: true,
            balance: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [dealsAsAdvertiser, dealsAsChannelOwner, successfulDeals, spentAggregate, earnedAggregate] = await Promise.all([
      this.prisma.deal.count({ where: { advertiserId: id } }),
      this.prisma.deal.count({ where: { channelOwnerId: id } }),
      this.prisma.deal.count({
        where: {
          OR: [{ advertiserId: id }, { channelOwnerId: id }],
          status: 'COMPLETED',
        },
      }),
      this.prisma.deal.aggregate({
        where: { advertiserId: id, status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      this.prisma.deal.aggregate({
        where: { channelOwnerId: id, status: 'COMPLETED' },
        _sum: { price: true },
      }),
    ]);

    const totalDeals = dealsAsAdvertiser + dealsAsChannelOwner;
    const calculatedSpent = spentAggregate._sum.totalAmount || user.totalSpent;
    const calculatedEarned = earnedAggregate._sum.price || user.totalEarned;

    return {
      ...user,
      totalDeals,
      successfulDeals,
      totalSpent: calculatedSpent.toString(),
      totalEarned: calculatedEarned.toString(),
      _count: {
        dealsAsAdvertiser,
        dealsAsChannelOwner,
        reviewsReceived: user.reviewCount,
      },
    };
  }

  async getPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        telegramUsername: true,
        photoUrl: true,
        rating: true,
        reviewCount: true,
        totalSpent: true,
        totalEarned: true,
        isVerified: true,
        createdAt: true,
        ownedChannels: {
          where: { status: { in: ['ACTIVE', 'VERIFIED'] } },
          select: {
            id: true,
            title: true,
            username: true,
            subscriberCount: true,
            photoUrl: true,
            rating: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [dealsAsAdvertiser, dealsAsChannelOwner, successfulDeals, spentAggregate, earnedAggregate] = await Promise.all([
      this.prisma.deal.count({
        where: { advertiserId: id },
      }),
      this.prisma.deal.count({
        where: { channelOwnerId: id },
      }),
      this.prisma.deal.count({
        where: {
          OR: [{ advertiserId: id }, { channelOwnerId: id }],
          status: 'COMPLETED',
        },
      }),

      this.prisma.deal.aggregate({
        where: {
          advertiserId: id,
          status: 'COMPLETED',
        },
        _sum: { totalAmount: true },
      }),

      this.prisma.deal.aggregate({
        where: {
          channelOwnerId: id,
          status: 'COMPLETED',
        },
        _sum: { price: true },
      }),
    ]);

    const totalDeals = dealsAsAdvertiser + dealsAsChannelOwner;


    const calculatedSpent = spentAggregate._sum.totalAmount || user.totalSpent;
    const calculatedEarned = earnedAggregate._sum.price || user.totalEarned;

    return {
      ...user,
      totalDeals,
      successfulDeals,
      totalSpent: calculatedSpent.toString(),
      totalEarned: calculatedEarned.toString(),
      _count: {
        dealsAsAdvertiser,
        dealsAsChannelOwner,
        reviewsReceived: user.reviewCount,
      },
    };
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        notificationsEnabled: dto.notificationsEnabled,
        emailNotifications: dto.emailNotifications,
        languageCode: dto.languageCode,
        updatedAt: new Date(),
      },
    });

    await this.redisService.del(`user:${id}`);

    this.eventEmitter.emit(EVENTS.USER_UPDATED, { userId: id });

    return user;
  }

  async connectWallet(id: string, dto: ConnectWalletDto): Promise<User> {

    const existingWallet = await this.prisma.userWallet.findUnique({
      where: { address: dto.address },
    });

    if (existingWallet && existingWallet.userId !== id) {
      throw new ConflictException('Wallet already connected to another account');
    }

    const user = await this.prisma.$transaction(async (prisma) => {

      const existingWallets = await prisma.userWallet.count({
        where: { userId: id },
      });

      const isMain = existingWallets === 0 || dto.setAsMain;

      if (isMain) {
        await prisma.userWallet.updateMany({
          where: { userId: id, isMain: true },
          data: { isMain: false },
        });
      }

      await prisma.userWallet.upsert({
        where: { address: dto.address },
        create: {
          userId: id,
          address: dto.address,
          publicKey: dto.publicKey,
          isMain,
        },
        update: {
          publicKey: dto.publicKey,
          isMain,
        },
      });

      if (isMain) {
        return prisma.user.update({
          where: { id },
          data: {
            tonWalletAddress: dto.address,
            tonWalletConnectedAt: new Date(),
          },
        });
      }

      return prisma.user.findUniqueOrThrow({ where: { id } });
    });

    await this.redisService.del(`user:${id}`);

    return user;
  }

  async disconnectWallet(id: string, address: string): Promise<void> {
    const wallet = await this.prisma.userWallet.findFirst({
      where: { userId: id, address },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    await this.prisma.$transaction(async (prisma) => {
      await prisma.userWallet.delete({
        where: { id: wallet.id },
      });

      if (wallet.isMain) {

        const nextWallet = await prisma.userWallet.findFirst({
          where: { userId: id },
        });

        if (nextWallet) {
          await prisma.userWallet.update({
            where: { id: nextWallet.id },
            data: { isMain: true },
          });

          await prisma.user.update({
            where: { id },
            data: { tonWalletAddress: nextWallet.address },
          });
        } else {
          await prisma.user.update({
            where: { id },
            data: {
              tonWalletAddress: null,
              tonWalletConnectedAt: null,
            },
          });
        }
      }
    });

    await this.redisService.del(`user:${id}`);
  }

  async getStatistics(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        totalDeals: true,
        successfulDeals: true,
        totalSpent: true,
        totalEarned: true,
        rating: true,
        reviewCount: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [activeDeals, pendingPayouts] = await Promise.all([
      this.prisma.deal.count({
        where: {
          OR: [{ advertiserId: id }, { channelOwnerId: id }],
          status: {
            notIn: ['COMPLETED', 'CANCELLED', 'REFUNDED', 'EXPIRED'],
          },
        },
      }),
      this.prisma.escrow.aggregate({
        where: {
          deal: { channelOwnerId: id },
          status: 'FUNDED',
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      ...user,
      totalSpent: user.totalSpent.toString(),
      totalEarned: user.totalEarned.toString(),
      activeDeals,
      pendingPayouts: (pendingPayouts._sum.amount || BigInt(0)).toString(),
    };
  }

  async addRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);

    if (user.roles.includes(role)) {
      return user;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        roles: [...user.roles, role],
      },
    });

    await this.redisService.del(`user:${id}`);

    return updatedUser;
  }

  async removeRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);

    if (!user.roles.includes(role)) {
      return user;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        roles: user.roles.filter((r) => r !== role),
      },
    });

    await this.redisService.del(`user:${id}`);

    return updatedUser;
  }

  async findAll(filters: UserFiltersDto): Promise<PaginatedResponseDto<User>> {
    const { page = 1, limit = 20, search, status, role, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { telegramUsername: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (role) {
      where.roles = { has: role };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return createPaginatedResponse(users, total, page, limit);
  }

  async updateLastActive(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });
  }

  async createFromTelegram(data: {
    telegramId: bigint;
    telegramUsername?: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
    languageCode?: string;
  }): Promise<User> {
    const existing = await this.findByTelegramId(data.telegramId);
    if (existing) {
      return existing;
    }

    return this.prisma.user.create({
      data: {
        telegramId: data.telegramId,
        telegramUsername: data.telegramUsername,
        firstName: data.firstName || 'User',
        lastName: data.lastName,
        photoUrl: data.photoUrl,
        languageCode: data.languageCode || 'en',
        roles: [UserRole.USER],
      },
    });
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    return this.update(id, dto);
  }
}
