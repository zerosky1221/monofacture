import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './notifications.processor';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { QUEUES } from '@telegram-ads/shared';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.NOTIFICATIONS,
    }),
    forwardRef(() => TelegramBotModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
