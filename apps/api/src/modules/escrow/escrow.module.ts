import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EscrowService } from './escrow.service';
import { EscrowController } from './escrow.controller';
import { TonWalletService } from './ton-wallet.service';
import { EscrowMonitorProcessor } from './escrow-monitor.processor';
import { DealsModule } from '../deals/deals.module';
import { BalanceModule } from '../balance/balance.module';
import { QUEUES } from '@telegram-ads/shared';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.ESCROW_MONITOR,
    }),
    forwardRef(() => DealsModule),
    forwardRef(() => BalanceModule),
  ],
  controllers: [EscrowController],
  providers: [EscrowService, TonWalletService, EscrowMonitorProcessor],
  exports: [EscrowService, TonWalletService],
})
export class EscrowModule {}
