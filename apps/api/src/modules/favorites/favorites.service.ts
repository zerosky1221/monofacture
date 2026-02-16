import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async getFavorites(userId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        include: {
          channel: {
            include: {
              pricing: { where: { isActive: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);
    return { items: items.map(f => f.channel), total, page, limit };
  }

  async getFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { channelId: true },
    });
    return favorites.map(f => f.channelId);
  }

  async addFavorite(userId: string, channelId: string) {
    return this.prisma.favorite.upsert({
      where: { userId_channelId: { userId, channelId } },
      create: { userId, channelId },
      update: {},
    });
  }

  async removeFavorite(userId: string, channelId: string) {
    return this.prisma.favorite.deleteMany({ where: { userId, channelId } });
  }

  async isFavorite(userId: string, channelId: string): Promise<boolean> {
    const count = await this.prisma.favorite.count({ where: { userId, channelId } });
    return count > 0;
  }
}
