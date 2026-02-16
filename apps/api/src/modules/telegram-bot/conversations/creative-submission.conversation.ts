import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';
import { BotContext, TelegramBotService } from '../telegram-bot.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { DealsService } from '../../deals/deals.service';
import { DealStateMachine } from '../../deals/deal-state-machine';
import { PostingService } from '../../posting/posting.service';
import { CreativeStatus, PostStatus } from '@prisma/client';

@Injectable()
export class CreativeSubmissionConversation {
  private readonly logger = new Logger(CreativeSubmissionConversation.name);

  constructor(
    private readonly botService: TelegramBotService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DealsService))
    private readonly dealsService: DealsService,
    @Inject(forwardRef(() => DealStateMachine))
    private readonly stateMachine: DealStateMachine,
    @Inject(forwardRef(() => PostingService))
    private readonly postingService: PostingService,
  ) {}

  async notifyAdvertiserCreativePending(dealId: string): Promise<void> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        advertiser: true,
        channelOwner: true,
        channel: true,
      },
    });

    if (!deal || !deal.advertiser.telegramId) return;

    const keyboard = new InlineKeyboard()
      .text('Write Ad Post', `creative:start:${dealId}`)
      .row()
      .webApp('Open Deal', this.botService.getMiniAppUrl());

    await this.botService.sendMessage(
      deal.advertiser.telegramId,
      `<b>Time to Create Your Ad!</b>\n\n` +
      `Deal: <code>${deal.referenceNumber}</code>\n` +
      `Channel: <b>${deal.channel.title}</b>\n\n` +
      `Send me the ad post exactly as it should appear in the channel.\n\n` +
      `You can include:\n` +
      `• Photos and videos\n` +
      `• Bold, italic, underline text\n` +
      `• Hyperlinks\n` +
      `• Any Telegram formatting\n\n` +
      `Press the button below to start.`,
      { keyboard },
    );

    if (deal.channelOwner.telegramId) {
      await this.botService.sendMessage(
        deal.channelOwner.telegramId,
        `<b>Waiting for Ad Post</b>\n\n` +
        `Deal: <code>${deal.referenceNumber}</code>\n` +
        `Channel: <b>${deal.channel.title}</b>\n\n` +
        `The advertiser is preparing the ad post.\n` +
        `You'll be notified when it's ready for your review.`,
      );
    }
  }

  async handleStartCreative(ctx: BotContext, dealId: string): Promise<void> {
    const userId = ctx.session?.userId;
    if (!userId) {
      await ctx.answerCallbackQuery('Please start the bot first with /start');
      return;
    }

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { channel: true, creative: true },
    });

    if (!deal) {
      await ctx.answerCallbackQuery('Deal not found');
      return;
    }

    if (deal.advertiserId !== userId) {
      await ctx.answerCallbackQuery('Only the advertiser can write the ad post');
      return;
    }

    const validStatuses = ['CREATIVE_PENDING', 'CREATIVE_REVISION_REQUESTED', 'IN_PROGRESS', 'PAYMENT_RECEIVED'];
    if (!validStatuses.includes(deal.status)) {
      await ctx.answerCallbackQuery('Creative submission not available at this stage');
      return;
    }

    ctx.session.step = 'creative:awaiting_message';
    ctx.session.data = { dealId, role: 'advertiser' };

    await ctx.answerCallbackQuery();

    let revisionNote = '';
    if (deal.status === 'CREATIVE_REVISION_REQUESTED' && deal.creative?.revisionRequests?.length) {
      const lastRevision = deal.creative.revisionRequests[deal.creative.revisionRequests.length - 1];
      revisionNote = `\n\n<b>Publisher feedback:</b>\n<i>${lastRevision}</i>\n`;
    }

    await ctx.reply(
      `<b>Send me your ad post</b>\n\n` +
      `Channel: <b>${deal.channel.title}</b>\n` +
      revisionNote +
      `Send your message exactly as it should appear in the channel.\n` +
      `Include any photos, videos, formatting, and links.\n\n` +
      `Type /cancel to cancel.`,
      { parse_mode: 'HTML' },
    );
  }

  async handleCreativeMessage(ctx: BotContext): Promise<void> {
    const dealId = ctx.session?.data?.dealId;
    if (!dealId) {
      ctx.session.step = undefined;
      return;
    }

    const userId = ctx.session?.userId;
    if (!userId) return;

    if (ctx.message?.text === '/cancel') {
      ctx.session.step = undefined;
      ctx.session.data = {};
      await ctx.reply('Creative submission cancelled.');
      return;
    }

    const message = ctx.message;
    if (!message) return;

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { channel: true },
    });

    if (!deal) {
      await ctx.reply('Deal not found');
      ctx.session.step = undefined;
      return;
    }

    const text = message.text || message.caption || '';
    const mediaUrls: string[] = [];

    if (message.photo) {
      const largestPhoto = message.photo[message.photo.length - 1];
      try {
        const file = await ctx.api.getFile(largestPhoto.file_id);
        mediaUrls.push(`https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`);
      } catch (e) {
        this.logger.warn(`Failed to get photo URL: ${(e as Error).message}`);
      }
    }
    if (message.video) mediaUrls.push(`video:${message.video.file_id}`);
    if (message.document) mediaUrls.push(`doc:${message.document.file_id}`);
    if (message.animation) mediaUrls.push(`gif:${message.animation.file_id}`);

    const chatId = message.chat.id;
    const messageId = message.message_id;
    ctx.session.data = {
      ...ctx.session.data,
      sourceChatId: chatId,
      sourceMessageId: messageId,
      text,
      mediaUrls,
    };
    ctx.session.step = 'creative:awaiting_confirm';

    await ctx.reply('<b>Preview of your ad:</b>', { parse_mode: 'HTML' });

    try {
      await ctx.api.copyMessage(chatId, chatId, messageId);
    } catch (e) {
      this.logger.warn(`Failed to show preview: ${(e as Error).message}`);
    }

    const keyboard = new InlineKeyboard()
      .text('Submit for Review', `creative:submit:${dealId}`)
      .row()
      .text('Edit', `creative:edit:${dealId}`)
      .text('Cancel', `creative:cancel:${dealId}`);

    await ctx.reply(
      `Is this correct?\n\nChannel owner will review before posting to <b>${deal.channel.title}</b>.`,
      { parse_mode: 'HTML', reply_markup: keyboard },
    );
  }

  async handleSubmitCreative(ctx: BotContext, dealId: string): Promise<void> {
    const userId = ctx.session?.userId;
    const sessionData = ctx.session?.data;

    if (!userId || !sessionData?.sourceChatId || !sessionData?.sourceMessageId) {
      await ctx.answerCallbackQuery('Session expired. Please try again.');
      return;
    }

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { channel: true, channelOwner: true },
    });

    if (!deal || deal.advertiserId !== userId) {
      await ctx.answerCallbackQuery('Not authorized');
      return;
    }

    try {

      await this.prisma.dealCreative.upsert({
        where: { dealId },
        create: {
          dealId,
          text: sessionData.text || null,
          mediaUrls: sessionData.mediaUrls || [],
          status: CreativeStatus.SUBMITTED,
          sourceChatId: BigInt(sessionData.sourceChatId),
          sourceMessageId: sessionData.sourceMessageId,
          submittedAt: new Date(),
        },
        update: {
          text: sessionData.text || null,
          mediaUrls: sessionData.mediaUrls || [],
          status: CreativeStatus.SUBMITTED,
          sourceChatId: BigInt(sessionData.sourceChatId),
          sourceMessageId: sessionData.sourceMessageId,
          submittedAt: new Date(),
          version: { increment: 1 },
        },
      });

      const validStatuses = ['CREATIVE_PENDING', 'CREATIVE_REVISION_REQUESTED', 'IN_PROGRESS', 'PAYMENT_RECEIVED'];
      if (validStatuses.includes(deal.status)) {
        await this.stateMachine.submitCreative(dealId, userId);
      }

      ctx.session.step = undefined;
      ctx.session.data = {};

      await ctx.answerCallbackQuery('Submitted!');
      await ctx.editMessageText(
        `<b>Ad Post Submitted!</b>\n\n` +
        `Sent to <b>${deal.channelOwner.firstName || 'channel owner'}</b> for review.\n` +
        `You'll be notified when they respond.`,
        { parse_mode: 'HTML' },
      );

      await this.sendCreativeToPublisher(dealId, sessionData.sourceChatId, sessionData.sourceMessageId);

    } catch (error) {
      this.logger.error(`Failed to submit creative: ${(error as Error).message}`);
      await ctx.answerCallbackQuery(`Error: ${(error as Error).message}`);
    }
  }

  async handleEditCreative(ctx: BotContext, dealId: string): Promise<void> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { channel: true },
    });

    ctx.session.step = 'creative:awaiting_message';
    ctx.session.data = { dealId, role: 'advertiser' };

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `<b>Send a new version</b>\n\n` +
      `Send your updated ad post for <b>${deal?.channel.title || 'the channel'}</b>.`,
      { parse_mode: 'HTML' },
    );
  }

  async handleCancelCreative(ctx: BotContext, dealId: string): Promise<void> {
    ctx.session.step = undefined;
    ctx.session.data = {};

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `Cancelled. You can start again when ready.`,
    );
  }

  private async sendCreativeToPublisher(dealId: string, sourceChatId: number, sourceMessageId: number): Promise<void> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        channelOwner: true,
        channel: true,
        advertiser: true,
      },
    });

    if (!deal || !deal.channelOwner.telegramId) return;

    await this.botService.sendMessage(
      deal.channelOwner.telegramId,
      `<b>New Ad Post for Review</b>\n\n` +
      `Deal: <code>${deal.referenceNumber}</code>\n` +
      `Channel: <b>${deal.channel.title}</b>\n` +
      `From: <b>${deal.advertiser.firstName || 'Advertiser'}</b>\n\n` +
      `The advertiser wants to publish this post:`,
    );

    try {
      await this.botService.getBot().api.copyMessage(
        Number(deal.channelOwner.telegramId),
        sourceChatId,
        sourceMessageId,
      );
    } catch (error) {
      this.logger.error(`Failed to copy to publisher: ${(error as Error).message}`);
      await this.botService.sendMessage(
        deal.channelOwner.telegramId,
        `Could not forward the post. Please check in the app.`,
      );
    }

    const keyboard = new InlineKeyboard()
      .text('Approve & Publish', `creative:approve:${dealId}`)
      .row()
      .text('Request Changes', `creative:revision:${dealId}`)
      .text('Reject', `creative:reject:${dealId}`);

    await this.botService.sendMessage(
      deal.channelOwner.telegramId,
      `Review the post above and make your decision:`,
      { keyboard },
    );
  }

  async handleApproveCreative(ctx: BotContext, dealId: string): Promise<void> {
    const userId = ctx.session?.userId;
    if (!userId) {
      await ctx.answerCallbackQuery('Please start with /start');
      return;
    }

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { channel: true, advertiser: true, creative: true },
    });

    if (!deal) {
      await ctx.answerCallbackQuery('Deal not found');
      return;
    }

    if (deal.channelOwnerId !== userId) {
      await ctx.answerCallbackQuery('Only the channel owner can approve');
      return;
    }

    if (deal.status !== 'CREATIVE_SUBMITTED') {
      await ctx.answerCallbackQuery('Creative not pending review');
      return;
    }

    try {

      await this.prisma.dealCreative.update({
        where: { dealId },
        data: {
          status: CreativeStatus.APPROVED,
          approvedAt: new Date(),
        },
      });

      await this.stateMachine.approveCreative(dealId, userId);

      const now = new Date();
      const scheduledTime = deal.scheduledPostTime;
      const MIN_DELAY_MS = 2 * 60 * 1000;

      if (scheduledTime && scheduledTime.getTime() > now.getTime() + MIN_DELAY_MS) {

        this.logger.log(`Deal ${dealId}: Scheduling post for ${scheduledTime.toISOString()}`);

        await this.postingService.schedulePost({
          dealId,
          scheduledFor: scheduledTime,
          content: deal.creative?.text || '',
          mediaUrls: deal.creative?.mediaUrls as string[],
          buttons: deal.creative?.buttons as Array<{ text: string; url: string }>,
        });

        await ctx.answerCallbackQuery('Approved! Post scheduled.');
        await ctx.editMessageText(
          `<b>Creative Approved!</b>\n\n` +
          `Post scheduled for <b>${scheduledTime.toLocaleString()}</b>\n` +
          `Channel: <b>${deal.channel.title}</b>\n\n` +
          `The post will be published automatically at the scheduled time.`,
          { parse_mode: 'HTML' },
        );

        if (deal.advertiser.telegramId) {
          await this.botService.sendMessage(
            deal.advertiser.telegramId,
            `<b>Creative Approved!</b>\n\n` +
            `Deal: <code>${deal.referenceNumber}</code>\n` +
            `Channel: <b>${deal.channel.title}</b>\n\n` +
            `Your post is scheduled for <b>${scheduledTime.toLocaleString()}</b>.\n` +
            `You'll be notified when it's published.`,
          );
        }
      } else {

        this.logger.log(`Deal ${dealId}: Publishing immediately (ASAP mode)`);

        await ctx.answerCallbackQuery('Approved! Publishing...');
        await ctx.editMessageText(
          `<b>Creative Approved!</b>\n\nPublishing to <b>${deal.channel.title}</b>...`,
          { parse_mode: 'HTML' },
        );

        await this.publishToChannel(dealId);

        await ctx.editMessageText(
          `<b>Published!</b>\n\n` +
          `The ad has been posted to <b>${deal.channel.title}</b>.\n` +
          `Waiting for advertiser to confirm and release payment.`,
          { parse_mode: 'HTML' },
        );
      }

    } catch (error) {
      this.logger.error(`Failed to approve: ${(error as Error).message}`);
      await ctx.answerCallbackQuery(`Error: ${(error as Error).message}`);
    }
  }

  private async publishToChannel(dealId: string): Promise<void> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { channel: true, creative: true, advertiser: true },
    });

    if (!deal?.creative?.sourceChatId || !deal.creative.sourceMessageId) {
      this.logger.error(`No source message for deal ${dealId}`);
      return;
    }

    try {

      const permissions = await this.botService.getBotPermissions(deal.channel.telegramId);
      if (!permissions?.canPostMessages) {
        this.logger.error(`Bot cannot post to ${deal.channel.title}`);

        const publisher = await this.prisma.user.findUnique({ where: { id: deal.channelOwnerId } });
        if (publisher?.telegramId) {
          await this.botService.sendMessage(
            publisher.telegramId,
            `<b>Cannot Post</b>\n\n` +
            `Please add me as an admin with posting permission to <b>${deal.channel.title}</b>, ` +
            `then try again.`,
          );
        }
        return;
      }

      const result = await this.botService.getBot().api.copyMessage(
        Number(deal.channel.telegramId),
        Number(deal.creative.sourceChatId),
        deal.creative.sourceMessageId,
      );

      const postUrl = deal.channel.username
        ? `https://t.me/${deal.channel.username}/${result.message_id}`
        : `https://t.me/c/${String(deal.channel.telegramId).replace('-100', '')}/${result.message_id}`;

      await this.prisma.publishedPost.create({
        data: {
          dealId,
          channelId: deal.channelId,
          telegramMessageId: result.message_id,
          content: deal.creative.text,
          mediaUrls: deal.creative.mediaUrls,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      try {
        const currentDeal = await this.prisma.deal.findUnique({ where: { id: dealId } });
        if (currentDeal?.status === 'CREATIVE_APPROVED') {
          await this.stateMachine.schedule(dealId);
        }
        await this.stateMachine.confirmPosted(dealId, deal.channelOwnerId);
      } catch (e) {
        await this.stateMachine.markPosted(dealId, result.message_id.toString());
      }

      this.logger.log(`Published deal ${dealId} to ${deal.channel.title}, msg ${result.message_id}`);

      if (deal.advertiser.telegramId) {
        const keyboard = new InlineKeyboard()
          .url('View Post', postUrl)
          .row()
          .text('Confirm & Release Payment', `creative:complete:${dealId}`);

        await this.botService.sendMessage(
          deal.advertiser.telegramId,
          `<b>Ad Published!</b>\n\n` +
          `Deal: <code>${deal.referenceNumber}</code>\n` +
          `Channel: <b>${deal.channel.title}</b>\n\n` +
          `Please verify the post and confirm to release payment.`,
          { keyboard },
        );
      }

    } catch (error) {
      this.logger.error(`Failed to publish: ${(error as Error).message}`);
    }
  }

  async handleRequestRevision(ctx: BotContext, dealId: string): Promise<void> {
    const userId = ctx.session?.userId;
    if (!userId) {
      await ctx.answerCallbackQuery('Please start with /start');
      return;
    }

    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.channelOwnerId !== userId) {
      await ctx.answerCallbackQuery('Not authorized');
      return;
    }

    ctx.session.step = 'creative:revision_feedback';
    ctx.session.data = { dealId, role: 'publisher' };

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `<b>Request Changes</b>\n\n` +
      `Please describe what the advertiser needs to change:`,
      { parse_mode: 'HTML' },
    );
  }

  async handleRevisionFeedback(ctx: BotContext): Promise<void> {
    const dealId = ctx.session?.data?.dealId;
    const userId = ctx.session?.userId;
    if (!dealId || !userId) return;

    const feedback = ctx.message?.text;
    if (!feedback) return;

    try {

      await this.prisma.dealCreative.update({
        where: { dealId },
        data: {
          status: CreativeStatus.REJECTED,
          rejectedAt: new Date(),
          revisionRequests: { push: feedback },
        },
      });

      await this.stateMachine.requestRevision(dealId, userId, feedback);

      ctx.session.step = undefined;
      ctx.session.data = {};

      await ctx.reply('Feedback sent to advertiser!');

      const deal = await this.prisma.deal.findUnique({
        where: { id: dealId },
        include: { advertiser: true, channel: true, channelOwner: true },
      });

      if (deal?.advertiser.telegramId) {
        const keyboard = new InlineKeyboard()
          .text('Submit New Version', `creative:start:${dealId}`);

        await this.botService.sendMessage(
          deal.advertiser.telegramId,
          `<b>Revision Requested</b>\n\n` +
          `Deal: <code>${deal.referenceNumber}</code>\n` +
          `Channel: <b>${deal.channel.title}</b>\n\n` +
          `<b>Feedback from ${deal.channelOwner.firstName || 'channel owner'}:</b>\n` +
          `<i>${feedback}</i>\n\n` +
          `Please submit a revised ad post.`,
          { keyboard },
        );
      }

    } catch (error) {
      this.logger.error(`Failed to request revision: ${(error as Error).message}`);
      await ctx.reply(`Error: ${(error as Error).message}`);
    }
  }

  async handleConfirmCompletion(ctx: BotContext, dealId: string): Promise<void> {
    const userId = ctx.session?.userId;
    if (!userId) {
      await ctx.answerCallbackQuery('Please start with /start');
      return;
    }

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { channel: true, channelOwner: true },
    });

    if (!deal || deal.advertiserId !== userId) {
      await ctx.answerCallbackQuery('Not authorized');
      return;
    }

    if (deal.status !== 'POSTED') {
      await ctx.answerCallbackQuery('Deal not in posted status');
      return;
    }

    try {
      await this.dealsService.confirmCompletion(dealId, userId);

      await ctx.answerCallbackQuery('Payment released!');
      await ctx.editMessageText(
        `<b>Deal Completed!</b>\n\n` +
        `Payment has been released for deal <code>${deal.referenceNumber}</code>.\n` +
        `Thank you for using Monofacture!`,
        { parse_mode: 'HTML' },
      );

      if (deal.channelOwner.telegramId) {
        await this.botService.sendMessage(
          deal.channelOwner.telegramId,
          `<b>Payment Received!</b>\n\n` +
          `Deal <code>${deal.referenceNumber}</code> completed.\n` +
          `Channel: <b>${deal.channel.title}</b>\n\n` +
          `Your earnings have been credited to your balance.`,
        );
      }

    } catch (error) {
      this.logger.error(`Failed to complete: ${(error as Error).message}`);
      await ctx.answerCallbackQuery(`Error: ${(error as Error).message}`);
    }
  }

  async handleRejectCreative(ctx: BotContext, dealId: string): Promise<void> {
    await this.handleRequestRevision(ctx, dealId);
  }

  async notifyPublisherCreativePending(dealId: string): Promise<void> {

    await this.notifyAdvertiserCreativePending(dealId);
  }

  async handleDeepLinkCreative(ctx: BotContext, dealId: string): Promise<void> {
    const userId = ctx.session?.userId;
    if (!userId) {
      await ctx.reply('Please try again.');
      return;
    }

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { channel: true, creative: true },
    });

    if (!deal) {
      await ctx.reply('Deal not found. Please check the link and try again.');
      return;
    }

    if (deal.advertiserId !== userId) {
      await ctx.reply(
        `<b>Access Denied</b>\n\n` +
        `Only the advertiser can write the ad post for this deal.`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    const validStatuses = ['CREATIVE_PENDING', 'CREATIVE_REVISION_REQUESTED', 'IN_PROGRESS', 'PAYMENT_RECEIVED'];
    if (!validStatuses.includes(deal.status)) {
      await ctx.reply(
        `<b>Not Available</b>\n\n` +
        `Creative submission is not available at this stage.\n` +
        `Current status: ${deal.status}`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    ctx.session.step = 'creative:awaiting_message';
    ctx.session.data = { dealId, role: 'advertiser' };

    let revisionNote = '';
    if (deal.status === 'CREATIVE_REVISION_REQUESTED' && deal.creative?.revisionRequests?.length) {
      const lastRevision = deal.creative.revisionRequests[deal.creative.revisionRequests.length - 1];
      revisionNote = `\n\n<b>⚠️ Publisher requested changes:</b>\n<i>${lastRevision}</i>\n`;
    }

    await ctx.reply(
      `<b>📝 Create Your Ad Post</b>\n\n` +
      `<b>Deal:</b> <code>${deal.referenceNumber}</code>\n` +
      `<b>Channel:</b> ${deal.channel.title}\n` +
      revisionNote +
      `\n<b>Send me your ad post below.</b>\n\n` +
      `You can include:\n` +
      `• Text with formatting (bold, italic, links)\n` +
      `• Photos, videos, GIFs\n` +
      `• Any Telegram formatting\n\n` +
      `The post will be sent exactly as you write it.\n\n` +
      `Type /cancel to cancel.`,
      { parse_mode: 'HTML' },
    );
  }

  async handleDeepLinkReview(ctx: BotContext, dealId: string): Promise<void> {
    const userId = ctx.session?.userId;
    if (!userId) {
      await ctx.reply('Please try again.');
      return;
    }

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { channel: true, creative: true, advertiser: true },
    });

    if (!deal) {
      await ctx.reply('Deal not found. Please check the link and try again.');
      return;
    }

    if (deal.channelOwnerId !== userId) {
      await ctx.reply(
        `<b>Access Denied</b>\n\n` +
        `Only the channel owner can review ad posts for this deal.`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (deal.status !== 'CREATIVE_SUBMITTED') {
      await ctx.reply(
        `<b>No Post to Review</b>\n\n` +
        `There is no pending ad post to review.\n` +
        `Current status: ${deal.status}`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (!deal.creative?.sourceChatId || !deal.creative.sourceMessageId) {
      await ctx.reply(
        `<b>Creative Not Available</b>\n\n` +
        `The ad post data is not available. Please ask the advertiser to resubmit.`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    await ctx.reply(
      `<b>📋 Review Ad Post</b>\n\n` +
      `<b>Deal:</b> <code>${deal.referenceNumber}</code>\n` +
      `<b>Channel:</b> ${deal.channel.title}\n` +
      `<b>From:</b> ${deal.advertiser.firstName || 'Advertiser'}\n\n` +
      `Here is the ad post for your review:`,
      { parse_mode: 'HTML' },
    );

    try {
      await ctx.api.copyMessage(
        ctx.chat!.id,
        Number(deal.creative.sourceChatId),
        deal.creative.sourceMessageId,
      );
    } catch (error) {
      this.logger.error(`Failed to copy creative: ${(error as Error).message}`);
      await ctx.reply(
        `Could not load the ad post. It may have been deleted.\n` +
        `Please ask the advertiser to resubmit.`,
      );
      return;
    }

    const keyboard = new InlineKeyboard()
      .text('✅ Approve & Publish', `creative:approve:${dealId}`)
      .row()
      .text('📝 Request Changes', `creative:revision:${dealId}`)
      .text('❌ Reject', `creative:reject:${dealId}`);

    await ctx.reply(
      `<b>Make your decision:</b>\n\n` +
      `• <b>Approve</b> — Post will be published to your channel\n` +
      `• <b>Request Changes</b> — Ask advertiser to edit\n` +
      `• <b>Reject</b> — Decline this ad`,
      { parse_mode: 'HTML', reply_markup: keyboard },
    );
  }
}
