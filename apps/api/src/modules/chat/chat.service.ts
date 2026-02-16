import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getMessages(userId: string, dealId: string, page = 1, limit = 50) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.advertiserId !== userId && deal.channelOwnerId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const [messages, total] = await Promise.all([
      this.prisma.dealMessage.findMany({
        where: { dealId },
        include: { sender: { select: { id: true, firstName: true, photoUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dealMessage.count({ where: { dealId } }),
    ]);

    await this.prisma.dealMessage.updateMany({
      where: { dealId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });

    return { items: messages.reverse(), total, page, limit };
  }

  async sendMessage(userId: string, dealId: string, content: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.advertiserId !== userId && deal.channelOwnerId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.dealMessage.create({
      data: { dealId, senderId: userId, content },
      include: { sender: { select: { id: true, firstName: true, photoUrl: true } } },
    });
  }

  async getUnreadCount(userId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { OR: [{ advertiserId: userId }, { channelOwnerId: userId }] },
      select: { id: true },
    });

    const count = await this.prisma.dealMessage.count({
      where: {
        dealId: { in: deals.map(d => d.id) },
        senderId: { not: userId },
        isRead: false,
      },
    });

    return { unread: count };
  }
}
