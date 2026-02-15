import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { VerificationTier } from '@prisma/client';

@Injectable()
export class VerificationService {
  constructor(private prisma: PrismaService) {}

  async requestVerification(userId: string, channelId: string, tier: VerificationTier, documents: string[], notes?: string) {
    const channel = await this.prisma.channel.findFirst({ where: { id: channelId, ownerId: userId } });
    if (!channel) throw new ForbiddenException('Not your channel');

    const existing = await this.prisma.verificationRequest.findFirst({
      where: { channelId, status: 'PENDING' },
    });
    if (existing) throw new ForbiddenException('Pending request already exists');

    return this.prisma.verificationRequest.create({
      data: { channelId, tier, documents, notes },
    });
  }

  async getChannelVerification(channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { verificationTier: true },
    });
    const requests = await this.prisma.verificationRequest.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return { tier: channel?.verificationTier || 'NONE', requests };
  }

  async getMyRequests(userId: string) {
    const channels = await this.prisma.channel.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    return this.prisma.verificationRequest.findMany({
      where: { channelId: { in: channels.map(c => c.id) } },
      include: { channel: { select: { id: true, title: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
