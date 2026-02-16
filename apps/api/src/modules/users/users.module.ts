import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { StatsRecalculationService } from './stats-recalculation.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, StatsRecalculationService],
  exports: [UsersService, StatsRecalculationService],
})
export class UsersModule {}
