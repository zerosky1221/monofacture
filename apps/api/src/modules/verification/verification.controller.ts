import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { User, VerificationTier } from '@prisma/client';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('verification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('request')
  async requestVerification(
    @CurrentUser() user: User,
    @Body() body: { channelId: string; tier: VerificationTier; documents: string[]; notes?: string },
  ) {
    return this.verificationService.requestVerification(user.id, body.channelId, body.tier, body.documents, body.notes);
  }

  @Get('channel/:channelId')
  async getChannelVerification(@Param('channelId') channelId: string) {
    return this.verificationService.getChannelVerification(channelId);
  }

  @Get('my-requests')
  async getMyRequests(@CurrentUser() user: User) {
    return this.verificationService.getMyRequests(user.id);
  }
}
