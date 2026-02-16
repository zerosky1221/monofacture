import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AchievementsService } from './achievements.service';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('achievements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('achievements')
export class AchievementsController {
  constructor(
    private readonly achievementsService: AchievementsService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  @Get()
  async getUserAchievements(@CurrentUser() user: User) {
    return this.achievementsService.getUserAchievements(user.id);
  }

  @Get('level')
  async getUserLevel(@CurrentUser() user: User) {
    return this.achievementsService.getUserLevel(user.id);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @CurrentUser() user: User,
    @Query('sortBy') sortBy: 'xp' | 'deals' | 'earnings' = 'xp',
    @Query('limit') limit = '100',
  ) {
    return this.leaderboardService.getLeaderboard(user.id, sortBy, parseInt(limit));
  }

  @Get('my-rank')
  async getMyRank(@CurrentUser() user: User) {
    return this.leaderboardService.getUserRankInfo(user.id);
  }

  @Post('check')
  async checkAchievements(@CurrentUser() user: User) {
    const result = await this.achievementsService.checkAndAwardAll(user.id);
    await this.leaderboardService.recalculateUserXp(user.id);
    return result;
  }

  @Post('recalculate-xp')
  async recalculateXp(@CurrentUser() user: User) {
    const xp = await this.leaderboardService.recalculateUserXp(user.id);
    return { xp };
  }
}
