import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PostingService } from './posting.service';
import { PostingController } from './posting.controller';
import { PostSchedulerProcessor } from './post-scheduler.processor';
import { PostPublisherProcessor } from './post-publisher.processor';
import { PostVerificationProcessor } from './post-verification.processor';
import { DealsModule } from '../deals/deals.module';
import { ChannelsModule } from '../channels/channels.module';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { QUEUES } from '@telegram-ads/shared';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.POST_SCHEDULER },
      { name: QUEUES.POST_PUBLISHER },
      { name: QUEUES.POST_VERIFICATION },
    ),
    forwardRef(() => DealsModule),
    forwardRef(() => ChannelsModule),
    forwardRef(() => TelegramBotModule),
  ],
  controllers: [PostingController],
  providers: [
    PostingService,
    PostSchedulerProcessor,
    PostPublisherProcessor,
    PostVerificationProcessor,
  ],
  exports: [PostingService],
})
export class PostingModule {}
