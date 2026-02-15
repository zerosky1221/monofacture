import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ChannelStatsService } from './channel-stats.service';
import { QUEUES } from '@telegram-ads/shared';

@Processor(QUEUES.CHANNEL_STATS)
export class ChannelStatsProcessor {
  private readonly logger = new Logger(ChannelStatsProcessor.name);

  constructor(private readonly channelStatsService: ChannelStatsService) {}

  @Process('update-stats')
  async handleUpdateStats(job: Job<{ channelId: string }>): Promise<void> {
    this.logger.debug(`Updating stats for channel ${job.data.channelId}`);

    try {
      await this.channelStatsService.updateChannelStats(job.data.channelId);
    } catch (error) {
      this.logger.error(
        `Failed to update stats for ${job.data.channelId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Stats job ${job.id} failed: ${error.message}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job): void {
    this.logger.debug(`Stats job ${job.id} completed`);
  }
}
