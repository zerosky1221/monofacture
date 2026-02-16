import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { DealStatus, Deal, ActorType } from '@prisma/client';
import { DEAL_TRANSITIONS, EVENTS } from '@telegram-ads/shared';

export interface TransitionContext {
  dealId: string;
  actorId?: string;
  actorType?: ActorType;
  note?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class DealStateMachine {
  private readonly logger = new Logger(DealStateMachine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  canTransition(
    currentStatus: DealStatus,
    targetStatus: DealStatus,
    role: 'advertiser' | 'channel_owner' | 'admin' | 'system',
  ): boolean {
    const allowedTransitions = DEAL_TRANSITIONS[currentStatus];
    if (!allowedTransitions) return false;

    const transition = allowedTransitions.find((t) => t.to === targetStatus);
    if (!transition) return false;

    return transition.roles.includes(role);
  }

  getAllowedTransitions(
    currentStatus: DealStatus,
    role: 'advertiser' | 'channel_owner' | 'admin' | 'system',
  ): { to: DealStatus; action: string }[] {
    const allTransitions = DEAL_TRANSITIONS[currentStatus] || [];
    return allTransitions
      .filter((t) => t.roles.includes(role))
      .map(({ to, action }) => ({ to, action }));
  }

  async transition(
    targetStatus: DealStatus,
    role: 'advertiser' | 'channel_owner' | 'admin' | 'system',
    context: TransitionContext,
  ): Promise<Deal> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: context.dealId },
    });

    if (!deal) {
      throw new BadRequestException('Deal not found');
    }

    const currentStatus = deal.status;

    if (!this.canTransition(currentStatus, targetStatus, role)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${targetStatus} as ${role}`,
      );
    }

    const transition = DEAL_TRANSITIONS[currentStatus]?.find((t) => t.to === targetStatus);
    const action = transition?.action || 'transition';

    this.logger.log(
      `Deal ${context.dealId}: ${currentStatus} -> ${targetStatus} (action: ${action}, by: ${role})`,
    );

    const updatedDeal = await this.prisma.$transaction(async (prisma) => {

      const updated = await prisma.deal.update({
        where: { id: context.dealId },
        data: {
          status: targetStatus,
          previousStatus: currentStatus,
          lastActivityAt: new Date(),
          ...(targetStatus === DealStatus.COMPLETED && { completedAt: new Date() }),
          ...(targetStatus === DealStatus.CANCELLED && { cancelledAt: new Date() }),
          ...(targetStatus === DealStatus.PAYMENT_RECEIVED && { paidAt: new Date() }),
          ...(targetStatus === DealStatus.CREATIVE_SUBMITTED && { contentSubmittedAt: new Date() }),
          ...(targetStatus === DealStatus.POSTED && { publishedAt: new Date() }),
        },
      });

      await prisma.dealTimeline.create({
        data: {
          dealId: context.dealId,
          event: action,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          actorId: context.actorId,
          actorType: context.actorType || ActorType.SYSTEM,
          metadata: context.metadata as any,
          note: context.note,
        },
      });

      return updated;
    });

    this.eventEmitter.emit(EVENTS.DEAL_STATUS_CHANGED, {
      dealId: context.dealId,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      action,
      actorId: context.actorId,
    });

    if (targetStatus === DealStatus.COMPLETED) {
      this.eventEmitter.emit(EVENTS.DEAL_COMPLETED, { dealId: context.dealId });
    }

    return updatedDeal;
  }

  async accept(dealId: string, userId: string): Promise<Deal> {
    return this.transition(DealStatus.PENDING_PAYMENT, 'channel_owner', {
      dealId,
      actorId: userId,
      actorType: ActorType.USER,
    });
  }

  async reject(dealId: string, userId: string, reason?: string): Promise<Deal> {
    return this.transition(DealStatus.CANCELLED, 'channel_owner', {
      dealId,
      actorId: userId,
      actorType: ActorType.USER,
      note: reason,
    });
  }

  async cancel(dealId: string, userId: string, role: 'advertiser' | 'channel_owner', reason?: string): Promise<Deal> {
    return this.transition(DealStatus.CANCELLED, role, {
      dealId,
      actorId: userId,
      actorType: ActorType.USER,
      note: reason,
    });
  }

  async confirmPayment(dealId: string, txHash?: string): Promise<Deal> {
    return this.transition(DealStatus.PAYMENT_RECEIVED, 'system', {
      dealId,
      actorType: ActorType.SYSTEM,
      metadata: txHash ? { txHash } : undefined,
    });
  }

  async start(dealId: string): Promise<Deal> {

    const deal = await this.transition(DealStatus.IN_PROGRESS, 'system', {
      dealId,
      actorType: ActorType.SYSTEM,
    });

    return this.transition(DealStatus.CREATIVE_PENDING, 'system', {
      dealId,
      actorType: ActorType.SYSTEM,
    });
  }

  async submitCreative(dealId: string, userId: string): Promise<Deal> {
    return this.transition(DealStatus.CREATIVE_SUBMITTED, 'channel_owner', {
      dealId,
      actorId: userId,
      actorType: ActorType.USER,
    });
  }

  async approveCreative(dealId: string, userId: string): Promise<Deal> {
    return this.transition(DealStatus.CREATIVE_APPROVED, 'advertiser', {
      dealId,
      actorId: userId,
      actorType: ActorType.USER,
    });
  }

  async requestRevision(dealId: string, userId: string, feedback?: string): Promise<Deal> {
    return this.transition(DealStatus.CREATIVE_REVISION_REQUESTED, 'advertiser', {
      dealId,
      actorId: userId,
      actorType: ActorType.USER,
      note: feedback,
    });
  }

  async schedule(dealId: string): Promise<Deal> {
    return this.transition(DealStatus.SCHEDULED, 'system', {
      dealId,
      actorType: ActorType.SYSTEM,
    });
  }

  async markPosted(dealId: string, messageId?: string): Promise<Deal> {
    return this.transition(DealStatus.POSTED, 'system', {
      dealId,
      actorType: ActorType.SYSTEM,
      metadata: messageId ? { messageId } : undefined,
    });
  }

  async confirmPosted(dealId: string, userId: string, postUrl?: string): Promise<Deal> {
    return this.transition(DealStatus.POSTED, 'channel_owner', {
      dealId,
      actorId: userId,
      actorType: ActorType.USER,
      metadata: postUrl ? { postUrl } : undefined,
    });
  }

  async confirmCompletion(dealId: string, userId: string): Promise<Deal> {
    return this.transition(DealStatus.COMPLETED, 'advertiser', {
      dealId,
      actorId: userId,
      actorType: ActorType.USER,
    });
  }

  async startVerification(dealId: string): Promise<Deal> {
    return this.transition(DealStatus.VERIFYING, 'system', {
      dealId,
      actorType: ActorType.SYSTEM,
    });
  }

  async markVerified(dealId: string): Promise<Deal> {
    return this.transition(DealStatus.VERIFIED, 'system', {
      dealId,
      actorType: ActorType.SYSTEM,
    });
  }

  async complete(dealId: string): Promise<Deal> {
    return this.transition(DealStatus.COMPLETED, 'system', {
      dealId,
      actorType: ActorType.SYSTEM,
    });
  }

  async openDispute(dealId: string, userId: string, role: 'advertiser' | 'channel_owner', reason?: string): Promise<Deal> {
    return this.transition(DealStatus.DISPUTED, role, {
      dealId,
      actorId: userId,
      actorType: ActorType.USER,
      note: reason,
    });
  }

  async resolveDispute(
    dealId: string,
    adminId: string,
    resolution: 'channel_owner' | 'advertiser',
  ): Promise<Deal> {
    const targetStatus = resolution === 'channel_owner'
      ? DealStatus.COMPLETED
      : DealStatus.REFUNDED;

    return this.transition(targetStatus, 'admin', {
      dealId,
      actorId: adminId,
      actorType: ActorType.USER,
      note: `Resolved in favor of ${resolution}`,
    });
  }

  async expire(dealId: string): Promise<Deal> {
    return this.transition(DealStatus.EXPIRED, 'system', {
      dealId,
      actorType: ActorType.SYSTEM,
    });
  }
}
