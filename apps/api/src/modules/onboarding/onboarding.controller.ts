import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  async getStatus(@CurrentUser() user: User) {
    return this.onboardingService.getStatus(user.id);
  }

  @Patch()
  async update(@CurrentUser() user: User, @Body() data: Record<string, boolean>) {
    return this.onboardingService.update(user.id, data);
  }

  @Post('complete')
  async completeStep(@CurrentUser() user: User, @Body() body: { step: string }) {
    return this.onboardingService.completeStep(user.id, body.step);
  }
}
