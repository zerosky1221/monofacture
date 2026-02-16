import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class FaqService {
  private readonly logger = new Logger(FaqService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCategories() {
    return this.prisma.faqCategory.findMany({
      where: { isPublished: true },
      include: {
        items: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async getByCategory(slug: string) {
    return this.prisma.faqCategory.findUnique({
      where: { slug, isPublished: true },
      include: {
        items: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async search(query: string) {
    return this.prisma.faqItem.findMany({
      where: {
        isPublished: true,
        OR: [
          { question: { contains: query, mode: 'insensitive' } },
          { answer: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        category: {
          select: { title: true, slug: true },
        },
      },
      take: 10,
    });
  }

  async recordHelpful(itemId: string, helpful: boolean) {
    return this.prisma.faqItem.update({
      where: { id: itemId },
      data: {
        ...(helpful
          ? { helpfulYes: { increment: 1 } }
          : { helpfulNo: { increment: 1 } }),
        viewCount: { increment: 1 },
      },
    });
  }

  async incrementView(itemId: string) {
    return this.prisma.faqItem.update({
      where: { id: itemId },
      data: {
        viewCount: { increment: 1 },
      },
    });
  }
}
