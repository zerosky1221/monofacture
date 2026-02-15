import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('publisher/dashboard')
  async getDashboard(@CurrentUser() user: User, @Query('period') period: '7d' | '30d' | '90d' = '30d') {
    return this.analyticsService.getDashboard(user.id, period);
  }

  @Get('publisher/overview')
  async getPublisherOverview(@CurrentUser() user: User) {
    return this.analyticsService.getPublisherOverview(user.id);
  }

  @Get('publisher/earnings')
  async getEarnings(@CurrentUser() user: User, @Query('period') period: '7d' | '30d' | '90d' = '30d') {
    return this.analyticsService.getEarningsChart(user.id, period);
  }

  @Get('publisher/deals-by-format')
  async getDealsByFormat(@CurrentUser() user: User) {
    return this.analyticsService.getDealsByFormat(user.id);
  }

  @Get('publisher/top-advertisers')
  async getTopAdvertisers(@CurrentUser() user: User, @Query('limit') limit = 5) {
    return this.analyticsService.getTopAdvertisers(user.id, +limit);
  }

  @Get('advertiser/overview')
  async getAdvertiserOverview(@CurrentUser() user: User) {
    return this.analyticsService.getAdvertiserOverview(user.id);
  }
}
