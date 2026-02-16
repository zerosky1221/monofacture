import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../core/database/prisma.service';
import { PostingService } from './posting.service';
import { QUEUES } from '@telegram-ads/shared';
import { PostStatus } from '@prisma/client';

interface PublisherJobData {
  postId: string;
  dealId: string;
  channelId: string;
}

@Processor(QUEUES.POST_PUBLISHER)
export class PostPublisherProcessor {
  private readonly logger = new Logger(PostPublisherProcessor.name);

  constructor(
    private readonly postingService: PostingService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('publish-post')
  async handlePublishPost(job: Job<PublisherJobData>): Promise<void> {
    this.logger.debug(`Publishing post ${job.data.postId} for deal ${job.data.dealId}`);

    const post = await this.prisma.publishedPost.findUnique({
      where: { id: job.data.postId },
      select: { status: true, publishedAt: true },
    });

    if (post?.status === PostStatus.PUBLISHED || post?.publishedAt) {
      this.logger.warn(`Post ${job.data.postId} already published, skipping job`);
      return;
    }

    try {
      await this.postingService.publishPost(job.data.postId);
      this.logger.log(`Post ${job.data.postId} published successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to publish post ${job.data.postId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @Process('retry-publish')
  async handleRetryPublish(job: Job<PublisherJobData>): Promise<void> {
    this.logger.debug(`Retrying publish for post ${job.data.postId}`);

    const post = await this.prisma.publishedPost.findUnique({
      where: { id: job.data.postId },
      select: { status: true, publishedAt: true },
    });

    if (post?.status === PostStatus.PUBLISHED || post?.publishedAt) {
      this.logger.warn(`Post ${job.data.postId} already published, skipping retry`);
      return;
    }

    try {
      await this.postingService.forcePublish(job.data.postId);
      this.logger.log(`Post ${job.data.postId} retry successful`);
    } catch (error) {
      this.logger.error(
        `Retry publish failed for post ${job.data.postId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any): void {
    this.logger.debug(`Post publisher job ${job.id} completed`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Post publisher job ${job.id} failed: ${error.message}`);

    if ((job.attemptsMade || 0) < 3) {
      this.logger.log(`Will retry post ${job.data.postId} (attempt ${(job.attemptsMade || 0) + 1})`);
    } else {
      this.logger.error(`Post ${job.data.postId} failed after max retries`);
    }
  }
}
