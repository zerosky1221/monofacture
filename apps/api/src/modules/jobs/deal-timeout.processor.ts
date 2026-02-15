import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../core/database/prisma.service';
import { DealStateMachine } from '../deals/deal-state-machine';
import { EscrowService } from '../escrow/escrow.service';
import { DealStatus, EscrowStatus } from '@prisma/client';
import { QUEUES } from '@telegram-ads/shared';

interface TimeoutJobData {
  dealId: string;
  action: 'payment' | 'creative' | 'posting' | 'general';
}

@Injectable()
@Processor(QUEUES.DEAL_TIMEOUT)
export class DealTimeoutProcessor {
  private readonly logger = new Logger(DealTimeoutProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DealStateMachine))
    private readonly dealStateMachine: DealStateMachine,
    @Inject(forwardRef(() => EscrowService))
    private readonly escrowService: EscrowService,
  ) {}

  @Process('check-timeout')
  async handleCheckTimeout(job: Job<TimeoutJobData>): Promise<void> {
    const { dealId, action } = job.data;

    this.logger.debug(`Checking timeout for deal ${dealId} (action: ${action})`);

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { escrow: true },
    });

    if (!deal) {
      this.logger.warn(`Deal ${dealId} not found`);
      return;
    }

    switch (action) {
      case 'payment':
        await this.handlePaymentTimeout(deal);
        break;
      case 'creative':
        await this.handleCreativeTimeout(deal);
        break;
      case 'posting':
        await this.handlePostingTimeout(deal);
        break;
      default:
        await this.handleGeneralTimeout(deal);
    }
  }

  private async handlePaymentTimeout(deal: any): Promise<void> {

    if (deal.status !== DealStatus.PENDING_PAYMENT) {
      return;
    }

    if (deal.paymentDeadline && new Date() > deal.paymentDeadline) {
      this.logger.log(`Deal ${deal.id} payment timeout - cancelling`);

      await this.dealStateMachine.expire(deal.id);

      await this.prisma.dealTimeline.create({
        data: {
          dealId: deal.id,
          event: 'PAYMENT_TIMEOUT',
          fromStatus: deal.status,
          toStatus: DealStatus.EXPIRED,
          actorType: 'SYSTEM',
          note: 'Deal expired due to payment timeout',
        },
      });
    }
  }

  private async handleCreativeTimeout(deal: any): Promise<void> {

    if (deal.status !== DealStatus.CREATIVE_PENDING) {
      return;
    }

    if (deal.creativeDeadline && new Date() > deal.creativeDeadline) {
      this.logger.log(`Deal ${deal.id} creative timeout - auto-expiring and refunding`);

      await this.dealStateMachine.expire(deal.id);

      await this.prisma.dealTimeline.create({
        data: {
          dealId: deal.id,
          event: 'CREATIVE_TIMEOUT',
          fromStatus: deal.status,
          toStatus: DealStatus.EXPIRED,
          actorType: 'SYSTEM',
          note: 'Deal expired: creative not submitted before deadline',
        },
      });

      if (deal.escrow && deal.escrow.status === EscrowStatus.FUNDED) {
        try {
          await this.escrowService.refundAdvertiser(deal.id, 'Creative submission timeout');
        } catch (error) {
          this.logger.error(`Failed to refund escrow for deal ${deal.id}: ${(error as Error).message}`);
        }
      }
    }
  }

  private async handlePostingTimeout(deal: any): Promise<void> {

    if (deal.status !== DealStatus.SCHEDULED) {
      return;
    }

    const scheduledTime = deal.scheduledPostTime;
    if (!scheduledTime) return;

    const gracePeriod = new Date(scheduledTime.getTime() + 60 * 60 * 1000);

    if (new Date() > gracePeriod) {
      this.logger.log(`Deal ${deal.id} posting timeout - auto-expiring and refunding`);

      await this.dealStateMachine.expire(deal.id);

      await this.prisma.dealTimeline.create({
        data: {
          dealId: deal.id,
          event: 'POSTING_TIMEOUT',
          fromStatus: deal.status,
          toStatus: DealStatus.EXPIRED,
          actorType: 'SYSTEM',
          note: 'Deal expired: post was not published within 1 hour of scheduled time',
        },
      });

      if (deal.escrow && deal.escrow.status === EscrowStatus.FUNDED) {
        try {
          await this.escrowService.refundAdvertiser(deal.id, 'Posting timeout');
        } catch (error) {
          this.logger.error(`Failed to refund escrow for deal ${deal.id}: ${(error as Error).message}`);
        }
      }
    }
  }

  private async handleGeneralTimeout(deal: any): Promise<void> {

    const lastActivity = deal.lastActivityAt || deal.updatedAt;
    const timeoutMinutes = deal.timeoutMinutes || 1440;
    const timeoutDate = new Date(lastActivity.getTime() + timeoutMinutes * 60 * 1000);

    if (new Date() > timeoutDate) {

      switch (deal.status) {
        case DealStatus.CREATED:
        case DealStatus.PENDING_PAYMENT:
          await this.dealStateMachine.expire(deal.id);
          break;

        case DealStatus.CREATIVE_PENDING:

          this.logger.log(`Deal ${deal.id} creative inactivity timeout - auto-expiring`);
          await this.dealStateMachine.expire(deal.id);
          if (deal.escrow && deal.escrow.status === EscrowStatus.FUNDED) {
            try {
              await this.escrowService.refundAdvertiser(deal.id, 'Creative inactivity timeout');
            } catch (error) {
              this.logger.error(`Failed to refund escrow for deal ${deal.id}: ${(error as Error).message}`);
            }
          }
          break;

        case DealStatus.PAYMENT_RECEIVED:
        case DealStatus.IN_PROGRESS:

          this.logger.warn(`Deal ${deal.id} inactive for ${timeoutMinutes} minutes`);
          break;

        default:

          break;
      }
    }
  }

  @Process('check-escrow-expiry')
  async handleCheckEscrowExpiry(job: Job): Promise<void> {
    this.logger.debug('Checking for expired escrows');

    const expiredEscrows = await this.prisma.escrow.findMany({
      where: {
        status: EscrowStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      include: { deal: true },
    });

    for (const escrow of expiredEscrows) {
      try {
        this.logger.log(`Escrow ${escrow.id} expired - cancelling deal`);

        await this.prisma.escrow.update({
          where: { id: escrow.id },
          data: { status: EscrowStatus.CANCELLED },
        });

        if (escrow.deal) {
          await this.dealStateMachine.expire(escrow.deal.id);
        }
      } catch (error) {
        this.logger.error(
          `Failed to process expired escrow ${escrow.id}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(`Processed ${expiredEscrows.length} expired escrows`);
  }

  @Process('check-all-timeouts')
  async handleCheckAllTimeouts(job: Job): Promise<void> {
    this.logger.debug('Checking all deal timeouts');

    const activeDeals = await this.prisma.deal.findMany({
      where: {
        status: {
          in: [
            DealStatus.CREATED,
            DealStatus.PENDING_PAYMENT,
            DealStatus.PAYMENT_RECEIVED,
            DealStatus.IN_PROGRESS,
            DealStatus.CREATIVE_PENDING,
            DealStatus.SCHEDULED,
          ],
        },
      },
      select: { id: true, status: true },
    });

    const statusActionMap: Partial<Record<DealStatus, TimeoutJobData['action']>> = {
      [DealStatus.PENDING_PAYMENT]: 'payment',
      [DealStatus.CREATIVE_PENDING]: 'creative',
      [DealStatus.SCHEDULED]: 'posting',
    };

    for (const deal of activeDeals) {
      const action = statusActionMap[deal.status] || 'general';
      await this.handleCheckTimeout({
        data: { dealId: deal.id, action },
      } as Job<TimeoutJobData>);
    }

    this.logger.log(`Checked timeouts for ${activeDeals.length} deals`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Deal timeout job ${job.id} failed: ${error.message}`);
  }
}
