import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { DealStateMachine } from './deal-state-machine';
import { EscrowModule } from '../escrow/escrow.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { PostingModule } from '../posting/posting.module';
import { QUEUES } from '@telegram-ads/shared';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.DEAL_TIMEOUT,
    }),
    PricingModule,
    forwardRef(() => EscrowModule),
    forwardRef(() => PostingModule),
    NotificationsModule,
    forwardRef(() => AchievementsModule),
  ],
  controllers: [DealsController],
  providers: [DealsService, DealStateMachine],
  exports: [DealsService, DealStateMachine],
})
export class DealsModule {}
