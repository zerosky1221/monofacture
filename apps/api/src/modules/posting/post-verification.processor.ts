import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PostingService } from './posting.service';
import { QUEUES } from '@telegram-ads/shared';

interface VerificationJobData {
  postId: string;
  dealId: string;
  isFinal: boolean;
}

@Processor(QUEUES.POST_VERIFICATION)
export class PostVerificationProcessor {
  private readonly logger = new Logger(PostVerificationProcessor.name);

  constructor(private readonly postingService: PostingService) {}

  @Process('verify-post')
  async handleVerifyPost(job: Job<VerificationJobData>): Promise<void> {
    this.logger.debug(
      `Verifying post ${job.data.postId} (final: ${job.data.isFinal})`,
    );

    try {
      const result = await this.postingService.verifyPost(
        job.data.postId,
        job.data.isFinal,
      );

      if (result.exists) {
        this.logger.log(
          `Post ${job.data.postId} verified - views: ${result.views}, reactions: ${result.reactions}`,
        );
      } else {
        this.logger.warn(`Post ${job.data.postId} was deleted or not found`);
      }
    } catch (error) {
      this.logger.error(
        `Verification failed for post ${job.data.postId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @Process('batch-verify')
  async handleBatchVerify(job: Job<{ postIds: string[] }>): Promise<void> {
    this.logger.debug(`Batch verifying ${job.data.postIds.length} posts`);

    const results = {
      verified: 0,
      deleted: 0,
      failed: 0,
    };

    for (const postId of job.data.postIds) {
      try {
        const result = await this.postingService.verifyPost(postId, false);
        if (result.exists) {
          results.verified++;
        } else {
          results.deleted++;
        }
      } catch (error) {
        results.failed++;
        this.logger.error(`Failed to verify post ${postId}: ${(error as Error).message}`);
      }
    }

    this.logger.log(
      `Batch verification complete - verified: ${results.verified}, deleted: ${results.deleted}, failed: ${results.failed}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Post verification job ${job.id} failed: ${error.message}`);
  }
}
