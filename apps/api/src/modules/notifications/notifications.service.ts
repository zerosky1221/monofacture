import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { Notification, NotificationType, NotificationSettings } from '@prisma/client';
import { EVENTS, QUEUES } from '@telegram-ads/shared';
import { InlineKeyboard } from 'grammy';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPayload {
  userId: string;
  telegramId: bigint;
  notification: Notification;
}

type SettingsCategory = 'deals' | 'reviews' | 'wallet' | 'referrals' | 'marketing' | 'system';

function getNotificationCategory(type: NotificationType): SettingsCategory {
  const t = type as string;

  if (
    t.startsWith('DEAL_') ||
    t === 'CREATIVE_SUBMITTED' ||
    t === 'CREATIVE_APPROVED' ||
    t === 'CREATIVE_REJECTED' ||
    t === 'POST_SCHEDULED' ||
    t === 'POST_PUBLISHED' ||
    t === 'POST_VERIFIED' ||
    t === 'DISPUTE_OPENED' ||
    t === 'CHANNEL_NEW_ORDER'
  ) return 'deals';

  if (t.startsWith('REVIEW_')) return 'reviews';

  if (
    t.startsWith('WALLET_') ||
    t === 'PAYMENT_RECEIVED' ||
    t === 'PAYOUT_SENT'
  ) return 'wallet';

  if (t.startsWith('REFERRAL_')) return 'referrals';

  return 'system';
}

function isInQuietHours(settings: NotificationSettings): boolean {
  if (!settings.quietHoursEnabled || !settings.quietHoursStart || !settings.quietHoursEnd) {
    return false;
  }

  const now = new Date();

  const tz = settings.quietHoursTimezone || 'UTC';
  let currentHHMM: string;
  try {
    currentHHMM = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
  } catch {

    currentHHMM = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
  }

  const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  const current = toMinutes(currentHHMM);
  const start = toMinutes(settings.quietHoursStart);
  const end = toMinutes(settings.quietHoursEnd);

  if (start <= end) {
    return current >= start && current < end;
  }
  return current >= start || current < end;
}

function isCategoryEnabled(settings: NotificationSettings, category: SettingsCategory): boolean {
  switch (category) {
    case 'deals': return settings.dealsEnabled;
    case 'reviews': return settings.reviewsEnabled;
    case 'wallet': return settings.walletEnabled;
    case 'referrals': return settings.referralEnabled;
    case 'marketing': return settings.marketingEnabled;
    case 'system': return true;
  }
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TelegramBotService))
    private readonly telegramBotService: TelegramBotService,
    @InjectQueue(QUEUES.NOTIFICATIONS) private readonly notificationQueue: Queue,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const settings = await this.getOrCreateSettings(dto.userId);
    const category = getNotificationCategory(dto.type);
    const categoryEnabled = isCategoryEnabled(settings, category);

    if (!categoryEnabled && category !== 'system') {
      this.logger.debug(`Skipping notification ${dto.type} for user ${dto.userId}: category '${category}' disabled`);
      return null;
    }

    if (!settings.inAppEnabled && category !== 'system') {
      this.logger.debug(`Skipping in-app notification ${dto.type} for user ${dto.userId}: in-app disabled`);

      if (user.notificationsEnabled && settings.telegramEnabled && !isInQuietHours(settings)) {
        const tempNotification = {
          id: 'temp',
          type: dto.type,
          title: dto.title,
          message: dto.message,
          entityType: dto.entityType || null,
          entityId: dto.entityId || null,
        } as Notification;
        await this.notificationQueue.add(
          'send-notification',
          {
            userId: dto.userId,
            telegramId: user.telegramId.toString(),
            notification: tempNotification,
            skipDbUpdate: true,
          },
          { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
        );
      }
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        entityType: dto.entityType,
        entityId: dto.entityId,
        metadata: dto.metadata,
      },
    });

    const shouldSendTelegram =
      user.notificationsEnabled &&
      settings.telegramEnabled &&
      !isInQuietHours(settings);

    if (shouldSendTelegram) {
      await this.notificationQueue.add(
        'send-notification',
        {
          userId: dto.userId,
          telegramId: user.telegramId.toString(),
          notification,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );
    } else {
      this.logger.debug(
        `Skipping Telegram for ${dto.type}: master=${user.notificationsEnabled}, telegram=${settings.telegramEnabled}, quietHours=${isInQuietHours(settings)}`,
      );
    }

    return notification;
  }

  async sendTelegram(telegramId: bigint, notification: Notification): Promise<void> {
    try {
      let keyboard: InlineKeyboard | undefined;

      if (notification.entityId) {
        keyboard = new InlineKeyboard();
        switch (notification.entityType) {
          case 'deal':
            keyboard.text('View Deal', `deal:view:${notification.entityId}`);
            break;
          case 'channel':
            keyboard.text('View Channel', `channel:view:${notification.entityId}`);
            break;
          case 'escrow':
            keyboard.text('View Payment', `deal:view:${notification.entityId}`);
            break;
        }
      }

      const message = `<b>${notification.title}</b>\n\n${notification.message}`;

      await this.telegramBotService.sendMessage(telegramId, message, {
        parseMode: 'HTML',
        keyboard,
      });

      if (notification.id && notification.id !== 'temp') {
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            isSent: true,
            sentAt: new Date(),
            sentVia: ['telegram'],
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to send notification ${notification.id}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ): Promise<{ items: Notification[]; total: number; unread: number }> {
    const where = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { items, total, unread };
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return result.count;
  }

  async delete(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.delete({
      where: { id: notificationId, userId },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async getOrCreateSettings(userId: string) {
    let settings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.notificationSettings.create({
        data: { userId },
      });
    }

    return settings;
  }

  async updateSettings(userId: string, dto: Record<string, any>) {
    return this.prisma.notificationSettings.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  @OnEvent(EVENTS.DEAL_CREATED)
  async handleDealCreated(payload: { dealId: string; advertiserId: string; channelOwnerId: string }): Promise<void> {
    try {
      const deal = await this.prisma.deal.findUnique({
        where: { id: payload.dealId },
        include: { channel: true, advertiser: true },
      });

      if (!deal) return;

      await this.create({
        userId: payload.channelOwnerId,
        type: NotificationType.DEAL_CREATED,
        title: 'New Deal Request',
        message: `You have a new ad request from @${deal.advertiser.telegramUsername || 'Unknown'} for ${deal.channel.title}`,
        entityType: 'deal',
        entityId: deal.id,
      });
    } catch (error) {
      this.logger.error(`handleDealCreated failed for deal ${payload.dealId}: ${(error as Error).message}`);
    }
  }

  @OnEvent(EVENTS.DEAL_STATUS_CHANGED)
  async handleDealStatusChanged(payload: {
    dealId: string;
    oldStatus: string;
    newStatus: string;
    userId?: string;
  }): Promise<void> {
    try {
      const deal = await this.prisma.deal.findUnique({
        where: { id: payload.dealId },
        include: { advertiser: true, channelOwner: true },
      });

      if (!deal) return;

      const statusMessages: Record<string, { title: string; message: string }> = {
        PENDING_PAYMENT: {
          title: 'Deal Accepted',
          message: `Your deal request has been accepted! Please proceed to payment.`,
        },
        PAYMENT_RECEIVED: {
          title: 'Payment Received',
          message: `Payment has been received and locked in escrow.`,
        },
        CREATIVE_SUBMITTED: {
          title: 'Creative Submitted',
          message: `The channel owner has submitted the creative for review.`,
        },
        CREATIVE_APPROVED: {
          title: 'Creative Approved',
          message: `Your creative has been approved! The post will be scheduled.`,
        },
        POSTED: {
          title: 'Post Published',
          message: `Your ad has been published to the channel.`,
        },
        COMPLETED: {
          title: 'Deal Completed',
          message: `The deal has been completed successfully. Funds have been released.`,
        },
        CANCELLED: {
          title: 'Deal Cancelled',
          message: `The deal has been cancelled.`,
        },
        EXPIRED: {
          title: 'Deal Expired',
          message: `The deal has expired due to timeout. If escrow was funded, a refund has been initiated.`,
        },
      };

      const statusInfo = statusMessages[payload.newStatus];
      if (!statusInfo) return;

      const notifyUserId =
        payload.userId === deal.advertiserId
          ? deal.channelOwnerId
          : deal.advertiserId;

      await this.create({
        userId: notifyUserId,
        type: NotificationType.DEAL_UPDATED,
        title: statusInfo.title,
        message: statusInfo.message,
        entityType: 'deal',
        entityId: deal.id,
      });
    } catch (error) {
      this.logger.error(`handleDealStatusChanged failed for deal ${payload.dealId}: ${(error as Error).message}`);
    }
  }

  @OnEvent(EVENTS.ESCROW_FUNDED)
  async handleEscrowFunded(payload: { escrowId: string; dealId: string }): Promise<void> {
    try {
      const deal = await this.prisma.deal.findUnique({
        where: { id: payload.dealId },
      });

      if (!deal) return;

      await this.create({
        userId: deal.channelOwnerId,
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Payment Received',
        message: 'The advertiser has funded the escrow. You can now proceed with the deal.',
        entityType: 'deal',
        entityId: deal.id,
      });
    } catch (error) {
      this.logger.error(`handleEscrowFunded failed for deal ${payload.dealId}: ${(error as Error).message}`);
    }
  }

  @OnEvent(EVENTS.ESCROW_RELEASED)
  async handleEscrowReleased(payload: { escrowId: string; dealId: string }): Promise<void> {
    try {
      const deal = await this.prisma.deal.findUnique({
        where: { id: payload.dealId },
      });

      if (!deal) return;

      await this.create({
        userId: deal.channelOwnerId,
        type: NotificationType.PAYOUT_SENT,
        title: 'Payout Sent',
        message: 'The payment has been released to your wallet.',
        entityType: 'deal',
        entityId: deal.id,
      });
    } catch (error) {
      this.logger.error(`handleEscrowReleased failed for deal ${payload.dealId}: ${(error as Error).message}`);
    }
  }

  @OnEvent(EVENTS.POST_PUBLISHED)
  async handlePostPublished(payload: { postId: string; dealId: string }): Promise<void> {
    try {
      const deal = await this.prisma.deal.findUnique({
        where: { id: payload.dealId },
      });

      if (!deal) return;

      await this.create({
        userId: deal.advertiserId,
        type: NotificationType.POST_PUBLISHED,
        title: 'Ad Published',
        message: 'Your ad has been published to the channel.',
        entityType: 'deal',
        entityId: deal.id,
      });
    } catch (error) {
      this.logger.error(`handlePostPublished failed for deal ${payload.dealId}: ${(error as Error).message}`);
    }
  }
}
