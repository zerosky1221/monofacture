import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EscrowService } from './escrow.service';
import { QUEUES } from '@telegram-ads/shared';

@Processor(QUEUES.ESCROW_MONITOR)
export class EscrowMonitorProcessor {
  private readonly logger = new Logger(EscrowMonitorProcessor.name);

  constructor(private readonly escrowService: EscrowService) {}

  private static readonly MAX_CHECKS = 240;

  @Process('monitor-payment')
  async handlePaymentMonitor(
    job: Job<{ escrowId: string; dealId: string; checkCount?: number }>,
  ): Promise<void> {
    const checkCount = job.data.checkCount || 0;
    this.logger.debug(`Checking payment for escrow ${job.data.escrowId} (attempt ${checkCount + 1}/${EscrowMonitorProcessor.MAX_CHECKS})`);

    try {
      const received = await this.escrowService.checkPayment(job.data.escrowId);

      if (!received) {
        if (checkCount >= EscrowMonitorProcessor.MAX_CHECKS) {
          this.logger.warn(`Payment monitor for escrow ${job.data.escrowId} reached max checks (${EscrowMonitorProcessor.MAX_CHECKS}), stopping`);
          return;
        }

        await job.queue.add(
          'monitor-payment',
          { ...job.data, checkCount: checkCount + 1 },
          {
            delay: 30000,
            removeOnComplete: true,
          },
        );
      }
    } catch (error) {
      this.logger.error(
        `Payment monitor failed for ${job.data.escrowId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Escrow monitor job ${job.id} failed: ${error.message}`);
  }
}
