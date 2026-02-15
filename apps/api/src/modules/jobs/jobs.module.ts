import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ChannelStatsCollector } from './channel-stats.collector';
import { DealTimeoutProcessor } from './deal-timeout.processor';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { ChannelsModule } from '../channels/channels.module';
import { DealsModule } from '../deals/deals.module';
import { EscrowModule } from '../escrow/escrow.module';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { QUEUES } from '@telegram-ads/shared';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      { name: QUEUES.CHANNEL_STATS },
      { name: QUEUES.DEAL_TIMEOUT },
    ),
    forwardRef(() => ChannelsModule),
    forwardRef(() => DealsModule),
    forwardRef(() => EscrowModule),
    forwardRef(() => TelegramBotModule),
  ],
  providers: [
    ChannelStatsCollector,
    DealTimeoutProcessor,
    ScheduledTasksService,
  ],
  exports: [ScheduledTasksService],
})
export class JobsModule {}
