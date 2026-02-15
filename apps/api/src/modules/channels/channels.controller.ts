import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ChannelsService } from './channels.service';
import { ChannelStatsService } from './channel-stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  CreateChannelDto,
  UpdateChannelDto,
  ChannelPricingDto,
  ChannelFiltersDto,
  ChannelResponseDto,
} from './dto/channels.dto';

@ApiTags('channels')
@Controller('channels')
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly channelStatsService: ChannelStatsService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active channels' })
  @ApiPaginatedResponse(ChannelResponseDto)
  async findAll(@Query() filters: ChannelFiltersDto) {
    return this.channelsService.findAll(filters);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my/channels')
  @ApiOperation({ summary: 'Get my channels' })
  async getMyChannels(@CurrentUser() user: User) {
    return this.channelsService.findByOwner(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('admin/update-photos')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger bulk photo update for all channels' })
  async triggerPhotoUpdate(@CurrentUser() user: User) {
    await this.channelStatsService.schedulePhotoUpdate();
    return { message: 'Photo update job scheduled' };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get channel details' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, type: ChannelResponseDto })
  async findOne(@Param('id') id: string, @CurrentUser() user?: User) {
    return this.channelsService.getChannelDetails(id, user?.id);
  }

  @Public()
  @Get(':id/pricing')
  @ApiOperation({ summary: 'Get channel pricing' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  async getPricing(@Param('id') id: string) {
    return this.channelsService.getPricing(id);
  }

  @Public()
  @Get(':id/stats')
  @ApiOperation({ summary: 'Get channel statistics' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  async getStats(@Param('id') id: string) {
    return this.channelStatsService.getChannelStats(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/stats/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force update channel statistics (channel owner)' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  async forceUpdateStats(@Param('id') id: string, @CurrentUser() user: User) {
    const channel = await this.channelsService.findById(id);
    if (channel.ownerId !== user.id) {
      throw new ForbiddenException('You are not the owner of this channel');
    }
    const stats = await this.channelStatsService.updateChannelStats(id);
    return { message: 'Stats updated', stats };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Register a new channel' })
  @ApiResponse({ status: 201, type: ChannelResponseDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateChannelDto) {
    return this.channelsService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify channel ownership' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  async verifyChannel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.channelsService.verifyChannel(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate channel for listings' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  async activateChannel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.channelsService.activateChannel(id, user.id);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update channel' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channelsService.update(id, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/pricing')
  @ApiOperation({ summary: 'Set channel pricing' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  async setPricing(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() pricing: ChannelPricingDto[],
  ) {
    return this.channelsService.setPricing(id, user.id, pricing);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete channel' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    await this.channelsService.delete(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/stats/refresh')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request stats refresh' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  async refreshStats(@CurrentUser() user: User, @Param('id') id: string) {

    const channel = await this.channelsService.findById(id);
    if (channel.ownerId !== user.id) {
      throw new ForbiddenException('You are not the owner of this channel');
    }

    await this.channelStatsService.scheduleStatsUpdate(id);
    return { message: 'Stats update scheduled' };
  }

}
