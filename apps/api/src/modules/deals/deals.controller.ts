import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { DealsService } from './deals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import {
  CreateDealDto,
  SubmitCreativeDto,
  RequestRevisionDto,
  RejectDealDto,
  CancelDealDto,
  ConfirmPostDto,
  DealFiltersDto,
  DealResponseDto,
} from './dto/deals.dto';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  @ApiOperation({ summary: 'List my deals' })
  @ApiPaginatedResponse(DealResponseDto)
  async findAll(@CurrentUser() user: User, @Query() filters: DealFiltersDto) {
    return this.dealsService.findAll(user.id, filters);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get deals for calendar view' })
  async getCalendarDeals(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.dealsService.getCalendarDeals(user.id, parseInt(month), parseInt(year));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deal details' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 200, type: DealResponseDto })
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.dealsService.getDealDetails(id, user.id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get deal timeline' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  async getTimeline(@CurrentUser() user: User, @Param('id') id: string) {
    return this.dealsService.getTimeline(id, user.id);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  @ApiOperation({ summary: 'Create a new deal' })
  @ApiResponse({ status: 201, type: DealResponseDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateDealDto) {
    return this.dealsService.create(user.id, dto);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept deal (channel owner)' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  async accept(@CurrentUser() user: User, @Param('id') id: string) {
    return this.dealsService.accept(id, user.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject deal (channel owner)' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  async reject(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RejectDealDto,
  ) {
    return this.dealsService.reject(id, user.id, dto.reason);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel deal' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  async cancel(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CancelDealDto,
  ) {
    return this.dealsService.cancel(id, user.id, dto.reason);
  }

  @Post(':id/creative')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit creative (channel owner)' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  async submitCreative(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SubmitCreativeDto,
  ) {
    return this.dealsService.submitCreative(id, user.id, dto);
  }

  @Post(':id/creative/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve creative (advertiser)' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  async approveCreative(@CurrentUser() user: User, @Param('id') id: string) {
    return this.dealsService.approveCreative(id, user.id);
  }

  @Post(':id/creative/revision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request creative revision (advertiser)' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  async requestRevision(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RequestRevisionDto,
  ) {
    return this.dealsService.requestRevision(id, user.id, dto.feedback);
  }

  @Post(':id/confirm-post')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm post published (channel owner)' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  async confirmPost(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ConfirmPostDto,
  ) {
    return this.dealsService.confirmPost(id, user.id, dto.postUrl);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm completion and release payment (advertiser)' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  async confirmCompletion(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.dealsService.confirmCompletion(id, user.id);
  }
}
