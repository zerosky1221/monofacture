import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsService, NotificationPayload } from './notifications.service';
import { QUEUES } from '@telegram-ads/shared';

@Processor(QUEUES.NOTIFICATIONS)
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('send-notification')
  async handleSendNotification(job: Job<NotificationPayload>): Promise<void> {
    const { telegramId, notification } = job.data;

    this.logger.debug(`Sending notification ${notification.id} to ${telegramId}`);

    try {
      await this.notificationsService.sendTelegram(telegramId, notification);
      this.logger.log(`Notification ${notification.id} sent successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification ${notification.id}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @Process('send-bulk-notification')
  async handleSendBulkNotification(
    job: Job<{ userIds: string[]; title: string; message: string }>,
  ): Promise<void> {
    const { userIds, title, message } = job.data;

    this.logger.debug(`Sending bulk notification to ${userIds.length} users`);

    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.notificationsService.create({
          userId,
          type: 'SYSTEM' as any,
          title,
          message,
        });
        sent++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to notify user ${userId}: ${(error as Error).message}`);
      }
    }

    this.logger.log(`Bulk notification complete: ${sent} sent, ${failed} failed`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Notification job ${job.id} failed: ${error.message}`);
  }
}
