import { Module } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { LeaderboardService } from './leaderboard.service';

@Module({
  controllers: [AchievementsController],
  providers: [AchievementsService, LeaderboardService],
  exports: [AchievementsService, LeaderboardService],
})
export class AchievementsModule {}
