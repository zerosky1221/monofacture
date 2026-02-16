import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { DealStateMachine } from '../deals/deal-state-machine';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import {
  PublishedPost,
  Deal,
  DealStatus,
  PostStatus,
  Channel,
  AdFormat,
} from '@prisma/client';
import { InlineKeyboard } from 'grammy';
import { EVENTS, QUEUES } from '@telegram-ads/shared';

export interface SchedulePostDto {
  dealId: string;
  scheduledFor: Date;
  content: string;
  mediaUrls?: string[];
  buttons?: Array<{ text: string; url: string }>;
}

export interface PostVerificationResult {
  exists: boolean;
  messageId?: number;
  views?: number;
  reactions?: number;
  forwards?: number;
  isEdited?: boolean;
  verifiedAt: Date;
}

@Injectable()
export class PostingService {
  private readonly logger = new Logger(PostingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => DealStateMachine))
    private readonly dealStateMachine: DealStateMachine,
    @Inject(forwardRef(() => TelegramBotService))
    private readonly telegramBot: TelegramBotService,
    @InjectQueue(QUEUES.POST_SCHEDULER) private readonly schedulerQueue: Queue,
    @InjectQueue(QUEUES.POST_PUBLISHER) private readonly publisherQueue: Queue,
    @InjectQueue(QUEUES.POST_VERIFICATION) private readonly verificationQueue: Queue,
  ) {}

  async schedulePost(dto: SchedulePostDto): Promise<PublishedPost> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dto.dealId },
      include: {
        channel: true,
        creative: true,
      },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    if (deal.status !== DealStatus.CREATIVE_APPROVED && deal.status !== DealStatus.SCHEDULED) {
      throw new BadRequestException('Deal is not ready for scheduling');
    }

    const now = new Date();
    const scheduledFor = new Date(dto.scheduledFor);

    if (scheduledFor <= now) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    const publishedPost = await this.prisma.publishedPost.create({
      data: {
        dealId: dto.dealId,
        channelId: deal.channelId,
        content: dto.content,
        mediaUrls: dto.mediaUrls || [],
        buttons: dto.buttons || [],
        scheduledFor,
        status: PostStatus.SCHEDULED,
      },
    });

    if (deal.status === DealStatus.CREATIVE_APPROVED) {
      await this.dealStateMachine.schedule(deal.id);
    }

    const delay = scheduledFor.getTime() - now.getTime();
    await this.publisherQueue.add(
      'publish-post',
      {
        postId: publishedPost.id,
        dealId: dto.dealId,
        channelId: deal.channelId,
      },
      {
        delay,
        removeOnComplete: true,
        jobId: `publish-${publishedPost.id}`,
      },
    );

    this.eventEmitter.emit(EVENTS.POST_SCHEDULED, {
      postId: publishedPost.id,
      dealId: dto.dealId,
      scheduledFor,
    });

    this.logger.log(`Post ${publishedPost.id} scheduled for ${scheduledFor}`);

    return publishedPost;
  }

  async reschedulePost(postId: string, newScheduledFor: Date): Promise<PublishedPost> {
    const post = await this.prisma.publishedPost.findUnique({
      where: { id: postId },
      include: { deal: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== PostStatus.SCHEDULED) {
      throw new BadRequestException('Can only reschedule scheduled posts');
    }

    const now = new Date();
    if (newScheduledFor <= now) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    const oldJob = await this.publisherQueue.getJob(`publish-${postId}`);
    if (oldJob) {
      await oldJob.remove();
    }

    const updatedPost = await this.prisma.publishedPost.update({
      where: { id: postId },
      data: { scheduledFor: newScheduledFor },
    });

    const delay = newScheduledFor.getTime() - now.getTime();
    await this.publisherQueue.add(
      'publish-post',
      {
        postId,
        dealId: post.dealId,
        channelId: post.channelId,
      },
      {
        delay,
        removeOnComplete: true,
        jobId: `publish-${postId}`,
      },
    );

    this.logger.log(`Post ${postId} rescheduled for ${newScheduledFor}`);

    return updatedPost;
  }

  async cancelScheduledPost(postId: string): Promise<PublishedPost> {
    const post = await this.prisma.publishedPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== PostStatus.SCHEDULED) {
      throw new BadRequestException('Can only cancel scheduled posts');
    }

    const job = await this.publisherQueue.getJob(`publish-${postId}`);
    if (job) {
      await job.remove();
    }

    const updatedPost = await this.prisma.publishedPost.update({
      where: { id: postId },
      data: { status: PostStatus.CANCELLED },
    });

    this.logger.log(`Post ${postId} cancelled`);

    return updatedPost;
  }

  async publishPost(postId: string): Promise<PublishedPost> {
    const post = await this.prisma.publishedPost.findUnique({
      where: { id: postId },
      include: {
        deal: {
          include: {
            channel: true,
            creative: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status === PostStatus.PUBLISHED) {
      this.logger.warn(`Post ${postId} already published, skipping duplicate publish`);
      return post;
    }

    if (post.status === PostStatus.PUBLISHING && post.publishedAt) {
      this.logger.warn(`Post ${postId} already publishing with publishedAt set, skipping`);
      return post;
    }

    const channel = post.deal.channel;
    const deal = post.deal;
    const adFormat = deal.adFormat;

    const isBotAdmin = await this.telegramBot.checkBotAdmin(BigInt(channel.telegramId));
    if (!isBotAdmin) {
      await this.prisma.publishedPost.update({
        where: { id: postId },
        data: {
          status: PostStatus.FAILED,
          errorMessage: 'Bot is no longer admin of the channel',
        },
      });
      throw new BadRequestException('Bot is no longer admin of the channel');
    }

    const claimed = await this.prisma.publishedPost.updateMany({
      where: {
        id: postId,
        status: { in: [PostStatus.SCHEDULED, PostStatus.PUBLISHING, PostStatus.FAILED] },
        publishedAt: null,
      },
      data: { status: PostStatus.PUBLISHING },
    });

    if (claimed.count === 0) {

      const freshPost = await this.prisma.publishedPost.findUnique({ where: { id: postId } });
      if (freshPost?.status === PostStatus.PUBLISHED) {
        this.logger.warn(`Post ${postId} was claimed by another process, already published`);
        return freshPost;
      }
      this.logger.warn(`Post ${postId} could not be claimed (status: ${freshPost?.status}), skipping`);
      return post;
    }

    try {

      const result = await this.telegramBot.postToChannel(
        channel.telegramId.toString(),
        {
          text: post.content || '',
          mediaUrls: post.mediaUrls as string[],
          buttons: post.buttons as Array<{ text: string; url: string }>,
        },
        { parseMode: 'HTML', disableNotification: false },
      );

      const updatedPost = await this.prisma.publishedPost.update({
        where: { id: postId },
        data: {
          status: PostStatus.PUBLISHED,
          telegramMessageId: result.messageId,
          publishedAt: new Date(),
        },
      });

      await this.dealStateMachine.markPosted(post.dealId, String(result.messageId));

      await this.scheduleVerification(postId, post.deal);

      if (deal.postDuration && !deal.isPermanent) {
        await this.schedulePostDeletion(
          postId,
          channel.telegramId.toString(),
          result.messageId,
          deal.postDuration,
          adFormat as AdFormat,
          deal.id,
        );
      }

      await this.notifyPostPublished(post.deal, result.messageId);

      this.eventEmitter.emit(EVENTS.POST_PUBLISHED, {
        postId,
        dealId: post.dealId,
        messageId: result.messageId,
        channelId: channel.id,
        adFormat,
      });

      this.logger.log(`Post ${postId} published with message ID ${result.messageId}`);

      return updatedPost;
    } catch (error) {

      await this.prisma.publishedPost.update({
        where: { id: postId },
        data: {
          status: PostStatus.FAILED,
          errorMessage: (error as Error).message,
        },
      });

      this.logger.error(`Failed to publish post ${postId}: ${(error as Error).message}`);
      throw error;
    }
  }

  private async schedulePostDeletion(
    postId: string,
    channelId: string,
    messageId: number,
    durationHours: number,
    adFormat: AdFormat,
    dealId: string,
  ): Promise<void> {
    const delayMs = durationHours * 60 * 60 * 1000;
    const scheduledDeleteAt = new Date(Date.now() + delayMs);

    const oneHourBeforeMs = delayMs - 60 * 60 * 1000;
    const tenMinBeforeMs = delayMs - 10 * 60 * 1000;

    if (oneHourBeforeMs > 0) {
      await this.schedulerQueue.add(
        'pre-delete-notification',
        { postId, timeRemaining: '1 hour' },
        {
          delay: oneHourBeforeMs,
          removeOnComplete: true,
          jobId: `notify-delete-1h-${postId}`,
        },
      );
    }

    if (tenMinBeforeMs > 0) {
      await this.schedulerQueue.add(
        'pre-delete-notification',
        { postId, timeRemaining: '10 minutes' },
        {
          delay: tenMinBeforeMs,
          removeOnComplete: true,
          jobId: `notify-delete-10m-${postId}`,
        },
      );
    }

    const job = await this.schedulerQueue.add(
      'delete-post',
      { postId, channelId, messageId, adFormat },
      {
        delay: delayMs,
        removeOnComplete: true,
        jobId: `delete-${postId}`,
      },
    );

    await this.prisma.publishedPost.update({
      where: { id: postId },
      data: {
        scheduledDeleteAt,
        deleteJobId: job.id?.toString(),
      },
    });

    await this.prisma.deal.update({
      where: { id: dealId },
      data: { scheduledDeleteAt },
    });

    this.logger.log(
      `Scheduled deletion for post ${postId} (${adFormat}) in ${durationHours}h at ${scheduledDeleteAt.toISOString()}`,
    );
  }

  private async notifyPostPublished(
    deal: Deal & { channel: Channel },
    messageId: number,
  ): Promise<void> {
    try {

      const postUrl = deal.channel.username
        ? `https://t.me/${deal.channel.username}/${messageId}`
        : `https://t.me/c/${String(deal.channel.telegramId).replace('-100', '')}/${messageId}`;

      const advertiser = await this.prisma.user.findUnique({
        where: { id: deal.advertiserId },
      });

      if (advertiser) {
        const advertiserKeyboard = new InlineKeyboard()
          .url('📢 View Post', postUrl)
          .row()
          .text('✅ Confirm & Release Payment', `creative:complete:${deal.id}`);

        await this.telegramBot.sendMessage(
          BigInt(advertiser.telegramId),
          `Your ad has been published!\n\n` +
          `<b>Channel:</b> ${deal.channel.title}\n` +
          `<b>Deal:</b> #${deal.referenceNumber}\n\n` +
          `The post is now live. We'll verify it stays up for the agreed duration.`,
          {
            parseMode: 'HTML',
            keyboard: advertiserKeyboard,
          },
        );
      }

      const owner = await this.prisma.user.findUnique({
        where: { id: deal.channel.ownerId },
      });

      if (owner) {
        const ownerKeyboard = new InlineKeyboard()
          .url('📢 View Post', postUrl);

        await this.telegramBot.sendMessage(
          BigInt(owner.telegramId),
          `Ad published successfully!\n\n` +
          `<b>Channel:</b> ${deal.channel.title}\n` +
          `<b>Deal:</b> #${deal.referenceNumber}\n\n` +
          `Please keep the post up for the agreed duration. Payment will be released after verification.`,
          {
            parseMode: 'HTML',
            keyboard: ownerKeyboard,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send publish notifications: ${(error as Error).message}`);
    }
  }

  private async scheduleVerification(postId: string, deal: Deal): Promise<void> {

    const durationHours = (deal as any).postingDuration || 24;
    const durationMs = durationHours * 60 * 60 * 1000;

    const verificationIntervals = [
      1 * 60 * 60 * 1000,
      6 * 60 * 60 * 1000,
      12 * 60 * 60 * 1000,
      durationMs,
    ].filter(interval => interval <= durationMs);

    if (!verificationIntervals.includes(durationMs)) {
      verificationIntervals.push(durationMs);
    }

    for (const delay of verificationIntervals) {
      const isFinal = delay === durationMs;

      await this.verificationQueue.add(
        'verify-post',
        {
          postId,
          dealId: deal.id,
          isFinal,
        },
        {
          delay,
          removeOnComplete: true,
          jobId: `verify-${postId}-${delay}`,
        },
      );
    }

    this.logger.log(`Scheduled ${verificationIntervals.length} verification checks for post ${postId}`);
  }

  async verifyPost(postId: string, isFinal: boolean = false): Promise<PostVerificationResult> {
    const post = await this.prisma.publishedPost.findUnique({
      where: { id: postId },
      include: {
        deal: {
          include: { channel: true },
        },
      },
    });

    if (!post || !post.telegramMessageId) {
      return {
        exists: false,
        verifiedAt: new Date(),
      };
    }

    const channel = post.deal.channel;

    try {

      const messageInfo = await this.telegramBot.getMessageInfo(
        channel.telegramId.toString(),
        post.telegramMessageId,
      );

      const exists = messageInfo?.exists ?? false;

      const result: PostVerificationResult = {
        exists,
        messageId: post.telegramMessageId,
        views: messageInfo?.views,
        reactions: messageInfo?.reactions,
        forwards: messageInfo?.forwards,
        isEdited: messageInfo?.isEdited,
        verifiedAt: new Date(),
      };

      await this.prisma.publishedPost.update({
        where: { id: postId },
        data: {
          views: messageInfo?.views || post.views,
          reactions: messageInfo?.reactions || post.reactions,
          forwards: messageInfo?.forwards || post.forwards,
          lastVerifiedAt: new Date(),
          verificationCount: { increment: 1 },
        },
      });

      await this.prisma.postVerification.create({
        data: {
          postId,
          exists,
          views: messageInfo?.views,
          reactions: messageInfo?.reactions,
          forwards: messageInfo?.forwards,
        },
      });

      if (!exists) {
        await this.handlePostDeleted(post, isFinal);
        return result;
      }

      if (messageInfo?.isEdited) {
        await this.handlePostEdited(post);
      }

      if (isFinal && exists) {
        await this.dealStateMachine.markVerified(post.dealId);

        await this.notifyVerificationSuccess(post.deal);
      }

      this.eventEmitter.emit(EVENTS.POST_VERIFIED, {
        postId,
        dealId: post.dealId,
        ...result,
        isFinal,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to verify post ${postId}: ${(error as Error).message}`);

      await this.prisma.postVerification.create({
        data: {
          postId,
          exists: false,
        },
      });

      throw error;
    }
  }

  private async handlePostDeleted(
    post: PublishedPost & { deal: Deal & { channel: Channel } },
    isFinal: boolean,
  ): Promise<void> {

    await this.prisma.publishedPost.update({
      where: { id: post.id },
      data: {
        status: PostStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    if (!isFinal) {
      this.eventEmitter.emit(EVENTS.POST_VIOLATION, {
        postId: post.id,
        dealId: post.dealId,
        reason: 'Post deleted before required duration',
      });

      await this.prisma.dealTimeline.create({
        data: {
          dealId: post.dealId,
          event: 'POST_DELETED_EARLY',
          toStatus: post.deal.status,
          actorType: 'SYSTEM',
          note: 'Post was deleted before the required posting duration',
          metadata: { postId: post.id },
        },
      });

      const advertiser = await this.prisma.user.findUnique({
        where: { id: post.deal.advertiserId },
      });

      if (advertiser) {
        await this.telegramBot.sendMessage(
          BigInt(advertiser.telegramId),
          `<b>Post Violation Detected</b>\n\n` +
          `The ad post for deal #${post.deal.referenceNumber} was deleted early.\n` +
          `Channel: ${post.deal.channel.title}\n\n` +
          `You may be eligible for a refund. Please open a dispute if needed.`,
          { parseMode: 'HTML' },
        );
      }
    }

    this.logger.warn(`Post ${post.id} was deleted (isFinal: ${isFinal})`);
  }

  private async handlePostEdited(
    post: PublishedPost & { deal: Deal },
  ): Promise<void> {

    await this.prisma.dealTimeline.create({
      data: {
        dealId: post.dealId,
        event: 'POST_EDITED',
        toStatus: post.deal.status,
        actorType: 'SYSTEM',
        note: 'Post was edited after publication',
        metadata: { postId: post.id },
      },
    });

    this.logger.warn(`Post ${post.id} was edited after publication`);
  }

  private async notifyVerificationSuccess(deal: Deal & { channel: Channel }): Promise<void> {
    try {
      const advertiser = await this.prisma.user.findUnique({
        where: { id: deal.advertiserId },
      });

      if (advertiser) {
        await this.telegramBot.sendMessage(
          BigInt(advertiser.telegramId),
          `<b>Verification Complete!</b>\n\n` +
          `Deal #${deal.referenceNumber} has been verified.\n` +
          `The post stayed up for the required duration.\n\n` +
          `Payment is being released to the channel owner.`,
          { parseMode: 'HTML' },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send verification notification: ${(error as Error).message}`);
    }
  }

  async getPostById(postId: string): Promise<PublishedPost | null> {
    return this.prisma.publishedPost.findUnique({
      where: { id: postId },
      include: {
        deal: true,
        verifications: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async getPostsForDeal(dealId: string): Promise<PublishedPost[]> {
    return this.prisma.publishedPost.findMany({
      where: { dealId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPostsForChannel(
    channelId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: PublishedPost[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.publishedPost.findMany({
        where: { channelId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          deal: {
            select: {
              referenceNumber: true,
              advertiser: {
                select: { id: true, telegramUsername: true },
              },
            },
          },
        },
      }),
      this.prisma.publishedPost.count({ where: { channelId } }),
    ]);

    return { items, total };
  }

  async getScheduledPostsCount(channelId?: string): Promise<number> {
    return this.prisma.publishedPost.count({
      where: {
        status: PostStatus.SCHEDULED,
        ...(channelId && { channelId }),
      },
    });
  }

  async forcePublish(postId: string): Promise<PublishedPost> {
    const post = await this.prisma.publishedPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== PostStatus.SCHEDULED && post.status !== PostStatus.FAILED) {
      throw new BadRequestException('Post cannot be force published');
    }

    const job = await this.publisherQueue.getJob(`publish-${postId}`);
    if (job) {
      await job.remove();
    }

    return this.publishPost(postId);
  }
}
