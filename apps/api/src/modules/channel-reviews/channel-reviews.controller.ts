import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ChannelReviewsService } from './channel-reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateChannelReviewDto } from './dto/create-channel-review.dto';

@ApiTags('channel-reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('channel-reviews')
export class ChannelReviewsController {
  constructor(private readonly channelReviewsService: ChannelReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a channel review' })
  async create(@CurrentUser() user: User, @Body() dto: CreateChannelReviewDto) {
    return this.channelReviewsService.create(user.id, dto);
  }

  @Get('channel/:channelId')
  @ApiOperation({ summary: 'Get reviews for a channel' })
  async getChannelReviews(
    @Param('channelId') channelId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    return this.channelReviewsService.getChannelReviews(
      channelId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      sort || 'newest',
    );
  }

  @Get('stats/:channelId')
  @ApiOperation({ summary: 'Get channel review stats' })
  async getChannelStats(@Param('channelId') channelId: string) {
    return this.channelReviewsService.getChannelStats(channelId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get channel reviews I have given' })
  async getMyChannelReviews(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.channelReviewsService.getMyChannelReviews(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
