import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { ChannelStatsService } from './channel-stats.service';
import { ChannelStatsProcessor } from './channel-stats.processor';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { QUEUES } from '@telegram-ads/shared';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.CHANNEL_STATS,
    }),
    forwardRef(() => TelegramBotModule),
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService, ChannelStatsService, ChannelStatsProcessor],
  exports: [ChannelsService, ChannelStatsService],
})
export class ChannelsModule {}
