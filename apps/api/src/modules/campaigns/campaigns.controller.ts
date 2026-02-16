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
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignApplicationDto,
  CampaignFiltersDto,
  CampaignResponseDto,
} from './dto/campaigns.dto';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active campaigns' })
  @ApiPaginatedResponse(CampaignResponseDto)
  async findAll(@Query() filters: CampaignFiltersDto) {
    return this.campaignsService.findAll(filters);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  async findOne(@Param('id') id: string) {
    return this.campaignsService.getCampaignDetails(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my/campaigns')
  @ApiOperation({ summary: 'Get my campaigns (as advertiser)' })
  async getMyCampaigns(@CurrentUser() user: User) {
    return this.campaignsService.findByAdvertiser(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my/applications')
  @ApiOperation({ summary: 'Get my applications (as channel owner)' })
  async getMyApplications(@CurrentUser() user: User) {
    return this.campaignsService.getMyApplications(user.id);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiResponse({ status: 201, type: CampaignResponseDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(user.id, dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async publish(@CurrentUser() user: User, @Param('id') id: string) {
    return this.campaignsService.publish(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async pause(@CurrentUser() user: User, @Param('id') id: string) {
    return this.campaignsService.pause(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async resume(@CurrentUser() user: User, @Param('id') id: string) {
    return this.campaignsService.resume(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async close(@CurrentUser() user: User, @Param('id') id: string) {
    return this.campaignsService.close(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    await this.campaignsService.delete(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply to campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async apply(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CampaignApplicationDto,
  ) {
    return this.campaignsService.apply(id, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/applications/:applicationId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept application' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiParam({ name: 'applicationId', description: 'Application ID' })
  async acceptApplication(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.campaignsService.acceptApplication(id, applicationId, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/applications/:applicationId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject application' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiParam({ name: 'applicationId', description: 'Application ID' })
  async rejectApplication(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.campaignsService.rejectApplication(id, applicationId, user.id);
  }
}
