import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';

@ApiTags('reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post()
  @ApiOperation({ summary: 'Create a review for a completed deal' })
  async createReview(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(user.id, dto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get reviews for a user' })
  async getUserReviews(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: 'newest' | 'oldest' | 'highest' | 'lowest',
  ) {
    return this.reviewsService.getUserReviews(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      sort || 'newest',
    );
  }

  @Get('my/given')
  @ApiOperation({ summary: 'Get reviews I have given' })
  async getMyGivenReviews(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.getMyGivenReviews(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('my/received')
  @ApiOperation({ summary: 'Get reviews I have received' })
  async getMyReceivedReviews(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.getMyReceivedReviews(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('deal/:dealId')
  @ApiOperation({ summary: 'Get reviews for a specific deal' })
  async getDealReviews(@Param('dealId') dealId: string) {
    return this.reviewsService.getDealReviews(dealId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get deals pending my review' })
  async getPendingReviews(@CurrentUser() user: User) {
    return this.reviewsService.getPendingReviews(user.id);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Patch(':id/reply')
  @ApiOperation({ summary: 'Reply to a review' })
  async replyToReview(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.replyToReview(id, user.id, dto.reply);
  }

  @Get('stats/:userId')
  @ApiOperation({ summary: 'Get rating stats for a user' })
  async getUserStats(@Param('userId') userId: string) {
    return this.reviewsService.getUserStats(userId);
  }
}
