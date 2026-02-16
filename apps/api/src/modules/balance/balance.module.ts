import { Module, forwardRef } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { BalanceController } from './balance.controller';
import { EscrowModule } from '../escrow/escrow.module';

@Module({
  imports: [forwardRef(() => EscrowModule)],
  controllers: [BalanceController],
  providers: [BalanceService],
  exports: [BalanceService],
})
export class BalanceModule {}
