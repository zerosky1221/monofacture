import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { User, UserRole, PublishedPost } from '@prisma/client';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsDateString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PostingService } from './posting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../core/database/prisma.service';

class ButtonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  text: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;
}

class SchedulePostRequestDto {
  @IsString()
  @IsNotEmpty()
  dealId: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledFor: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ButtonDto)
  buttons?: ButtonDto[];
}

class ReschedulePostDto {
  @IsDateString()
  @IsNotEmpty()
  scheduledFor: string;
}

@ApiTags('posting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posting')
export class PostingController {
  constructor(
    private readonly postingService: PostingService,
    private readonly prisma: PrismaService,
  ) {}

  private async getPostOrThrow(postId: string): Promise<PublishedPost> {
    const post = await this.prisma.publishedPost.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  private async verifyDealParticipant(dealId: string, userId: string): Promise<void> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      select: { advertiserId: true, channelOwnerId: true },
    });
    if (!deal || (deal.advertiserId !== userId && deal.channelOwnerId !== userId)) {
      throw new ForbiddenException('You are not a participant of this deal');
    }
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a post for a deal' })
  @ApiResponse({ status: 201, description: 'Post scheduled successfully' })
  async schedulePost(
    @Body() dto: SchedulePostRequestDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyDealParticipant(dto.dealId, user.id);
    return this.postingService.schedulePost({
      dealId: dto.dealId,
      scheduledFor: new Date(dto.scheduledFor),
      content: dto.content,
      mediaUrls: dto.mediaUrls,
      buttons: dto.buttons,
    });
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch(':postId/reschedule')
  @ApiOperation({ summary: 'Reschedule a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  async reschedulePost(
    @Param('postId') postId: string,
    @Body() dto: ReschedulePostDto,
    @CurrentUser() user: User,
  ) {
    const post = await this.getPostOrThrow(postId);
    await this.verifyDealParticipant(post.dealId, user.id);
    return this.postingService.reschedulePost(postId, new Date(dto.scheduledFor));
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a scheduled post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  async cancelPost(
    @Param('postId') postId: string,
    @CurrentUser() user: User,
  ) {
    const post = await this.getPostOrThrow(postId);
    await this.verifyDealParticipant(post.dealId, user.id);
    await this.postingService.cancelScheduledPost(postId);
    return { success: true, message: 'Post cancelled' };
  }

  @Get(':postId')
  @ApiOperation({ summary: 'Get post details' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  async getPost(
    @Param('postId') postId: string,
    @CurrentUser() user: User,
  ) {
    const post = await this.getPostOrThrow(postId);
    await this.verifyDealParticipant(post.dealId, user.id);
    return post;
  }

  @Get(':postId/timer')
  @ApiOperation({ summary: 'Get post timer info (remaining duration)' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  async getPostTimer(
    @Param('postId') postId: string,
    @CurrentUser() user: User,
  ) {
    const post = await this.prisma.publishedPost.findUnique({
      where: { id: postId },
      include: { deal: { select: { advertiserId: true, channelOwnerId: true, postDuration: true } } },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.deal.advertiserId !== user.id && post.deal.channelOwnerId !== user.id) {
      throw new ForbiddenException('You are not a participant of this deal');
    }

    if (!post.publishedAt || !post.scheduledDeleteAt) {
      return {
        postId: post.id,
        dealId: post.dealId,
        publishedAt: post.publishedAt,
        scheduledDeleteAt: null,
        remainingMs: 0,
        isExpired: true,
      };
    }

    const now = Date.now();
    const remainingMs = Math.max(0, post.scheduledDeleteAt.getTime() - now);

    return {
      postId: post.id,
      dealId: post.dealId,
      publishedAt: post.publishedAt,
      scheduledDeleteAt: post.scheduledDeleteAt,
      remainingMs,
      isExpired: remainingMs <= 0,
    };
  }

  @Get('deal/:dealId')
  @ApiOperation({ summary: 'Get posts for a deal' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  async getPostsForDeal(
    @Param('dealId') dealId: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyDealParticipant(dealId, user.id);
    return this.postingService.getPostsForDeal(dealId);
  }

  @Get('channel/:channelId')
  @ApiOperation({ summary: 'Get posts for a channel' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  async getPostsForChannel(
    @Param('channelId') channelId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: User,
  ) {

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { ownerId: true },
    });
    if (!channel || channel.ownerId !== user.id) {
      throw new ForbiddenException('You are not the owner of this channel');
    }
    return this.postingService.getPostsForChannel(
      channelId,
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':postId/verify')
  @ApiOperation({ summary: 'Manually verify a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  async verifyPost(
    @Param('postId') postId: string,
    @CurrentUser() user: User,
  ) {
    const post = await this.getPostOrThrow(postId);
    await this.verifyDealParticipant(post.dealId, user.id);
    return this.postingService.verifyPost(postId);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(':postId/force-publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force publish a post (admin)' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  async forcePublish(@Param('postId') postId: string) {
    return this.postingService.forcePublish(postId);
  }

  @Get('stats/scheduled')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get scheduled posts count (admin)' })
  async getScheduledCount(@Query('channelId') channelId?: string) {
    const count = await this.postingService.getScheduledPostsCount(channelId);
    return { count };
  }
}
