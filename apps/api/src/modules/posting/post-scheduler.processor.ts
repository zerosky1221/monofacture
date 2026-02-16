import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../core/database/prisma.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { QUEUES } from '@telegram-ads/shared';
import { DealStatus, PostStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface SchedulerJobData {
  dealId: string;
  action: 'check-scheduling' | 'remind-schedule';
}

interface UnpinJobData {
  postId: string;
  channelId: string;
  messageId: number;
}

interface DeletePostJobData {
  postId: string;
  channelId: string;
  messageId: number;
  adFormat: string;
}

interface PreDeleteNotificationData {
  postId: string;
  timeRemaining: string;
}

@Processor(QUEUES.POST_SCHEDULER)
export class PostSchedulerProcessor {
  private readonly logger = new Logger(PostSchedulerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TelegramBotService))
    private readonly telegramBot: TelegramBotService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Process('check-scheduling')
  async handleCheckScheduling(job: Job<SchedulerJobData>): Promise<void> {
    this.logger.debug(`Checking scheduling for deal ${job.data.dealId}`);

    try {
      const deal = await this.prisma.deal.findUnique({
        where: { id: job.data.dealId },
        include: {
          publishedPosts: {
            where: { status: PostStatus.SCHEDULED },
          },
        },
      });

      if (!deal) {
        this.logger.warn(`Deal ${job.data.dealId} not found`);
        return;
      }

      if (deal.status !== DealStatus.CREATIVE_APPROVED) {
        return;
      }

      if (deal.publishedPosts.length > 0) {
        return;
      }

      this.logger.log(`Deal ${job.data.dealId} needs scheduling`);

    } catch (error) {
      this.logger.error(
        `Scheduling check failed for deal ${job.data.dealId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @Process('remind-schedule')
  async handleRemindSchedule(job: Job<SchedulerJobData>): Promise<void> {
    this.logger.debug(`Sending schedule reminder for deal ${job.data.dealId}`);

    try {
      const deal = await this.prisma.deal.findUnique({
        where: { id: job.data.dealId },
        include: {
          channelOwner: true,
          channel: true,
        },
      });

      if (!deal) {
        return;
      }

      this.logger.log(`Schedule reminder sent for deal ${job.data.dealId}`);

    } catch (error) {
      this.logger.error(
        `Schedule reminder failed for deal ${job.data.dealId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @Process('unpin-message')
  async handleUnpinMessage(job: Job<UnpinJobData>): Promise<void> {
    const { postId, channelId, messageId } = job.data;
    this.logger.debug(`Unpinning message ${messageId} for post ${postId}`);

    try {

      const post = await this.prisma.publishedPost.findUnique({
        where: { id: postId },
        include: { deal: true },
      });

      if (!post || post.status !== PostStatus.PUBLISHED) {
        this.logger.warn(`Post ${postId} not found or not published, skipping unpin`);
        return;
      }

      const unpinned = await this.telegramBot.unpinChatMessage(channelId, messageId);

      if (unpinned) {
        this.logger.log(`Successfully unpinned message ${messageId} for post ${postId}`);


        await this.prisma.dealTimeline.create({
          data: {
            dealId: post.dealId,
            event: 'PIN_DURATION_ENDED',
            toStatus: post.deal.status,
            actorType: 'SYSTEM',
            note: 'Pinned message unpinned after posting duration ended',
            metadata: { postId, messageId },
          },
        });
      } else {
        this.logger.warn(`Failed to unpin message ${messageId} for post ${postId}`);
      }
    } catch (error) {
      this.logger.error(`Unpin failed for post ${postId}: ${(error as Error).message}`);
      throw error;
    }
  }

  @Process('delete-post')
  async handleDeletePost(job: Job<DeletePostJobData>): Promise<void> {
    const { postId, channelId, messageId, adFormat } = job.data;
    this.logger.debug(`Deleting post ${postId} (${adFormat}) - message ${messageId}`);

    try {
      const post = await this.prisma.publishedPost.findUnique({
        where: { id: postId },
        include: { deal: true },
      });

      if (!post || post.status !== PostStatus.PUBLISHED) {
        this.logger.warn(`Post ${postId} not found or not published, skipping deletion`);
        return;
      }

      const deleted = await this.telegramBot.deleteMessage(BigInt(channelId), messageId);

      if (deleted) {
        this.logger.log(`Deleted message ${messageId} for post ${postId}`);

        await this.prisma.publishedPost.update({
          where: { id: postId },
          data: { status: PostStatus.DELETED, deletedAt: new Date() },
        });

        await this.prisma.dealTimeline.create({
          data: {
            dealId: post.dealId,
            event: 'POST_DURATION_ENDED',
            toStatus: post.deal.status,
            actorType: 'SYSTEM',
            note: `Post automatically deleted after ${post.deal.postDuration}h duration`,
            metadata: { postId, messageId, adFormat },
          },
        });

        this.eventEmitter.emit('post.duration.ended', {
          postId,
          dealId: post.dealId,
          channelId,
          messageId,
          adFormat,
        });
      } else {
        this.logger.warn(`Failed to delete message ${messageId} for post ${postId}`);
      }
    } catch (error) {
      this.logger.error(`Post deletion failed for ${postId}: ${(error as Error).message}`);
      throw error;
    }
  }

  @Process('pre-delete-notification')
  async handlePreDeleteNotification(job: Job<PreDeleteNotificationData>): Promise<void> {
    const { postId, timeRemaining } = job.data;

    try {
      const post = await this.prisma.publishedPost.findUnique({
        where: { id: postId },
        include: {
          deal: {
            include: {
              channel: true,
              advertiser: true,
              channelOwner: true,
            },
          },
        },
      });

      if (!post || post.status !== PostStatus.PUBLISHED) return;

      const { deal } = post;

      if (deal.channelOwner.telegramId) {
        await this.telegramBot.sendMessage(
          BigInt(deal.channelOwner.telegramId),
          `<b>Post Deletion Reminder</b>\n\n` +
            `Ad post for deal #${deal.referenceNumber} will be auto-deleted in <b>${timeRemaining}</b>.\n\n` +
            `Channel: ${deal.channel.title}\nFormat: ${deal.adFormat}`,
          { parseMode: 'HTML' },
        );
      }

      if (deal.advertiser.telegramId) {
        await this.telegramBot.sendMessage(
          BigInt(deal.advertiser.telegramId),
          `<b>Post Duration Ending</b>\n\n` +
            `Your ad in ${deal.channel.title} will be removed in <b>${timeRemaining}</b>.\n\n` +
            `Deal: #${deal.referenceNumber}\nDuration: ${deal.postDuration}h`,
          { parseMode: 'HTML' },
        );
      }

      this.logger.log(`Sent pre-delete notification (${timeRemaining}) for post ${postId}`);
    } catch (error) {
      this.logger.error(`Pre-delete notification failed: ${(error as Error).message}`);
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Post scheduler job ${job.id} failed: ${error.message}`);
  }
}
