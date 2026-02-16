import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class FiltersService {
  constructor(private prisma: PrismaService) {}

  async getSavedFilters(userId: string) {
    return this.prisma.savedFilter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFilter(userId: string, name: string, filters: any) {
    return this.prisma.savedFilter.create({
      data: { userId, name, filters },
    });
  }

  async updateFilter(userId: string, id: string, name?: string, filters?: any) {
    const filter = await this.prisma.savedFilter.findFirst({ where: { id, userId } });
    if (!filter) throw new NotFoundException('Filter not found');
    return this.prisma.savedFilter.update({
      where: { id },
      data: { ...(name && { name }), ...(filters && { filters }) },
    });
  }

  async deleteFilter(userId: string, id: string) {
    const filter = await this.prisma.savedFilter.findFirst({ where: { id, userId } });
    if (!filter) throw new NotFoundException('Filter not found');
    return this.prisma.savedFilter.delete({ where: { id } });
  }
}
