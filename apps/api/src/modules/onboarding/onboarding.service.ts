import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    let onboarding = await this.prisma.userOnboarding.findUnique({
      where: { userId },
    });
    if (!onboarding) {
      onboarding = await this.prisma.userOnboarding.create({
        data: { userId },
      });
    }
    return onboarding;
  }

  async update(userId: string, data: Partial<Record<string, boolean>>) {
    return this.prisma.userOnboarding.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async completeStep(userId: string, step: string) {
    const validSteps = [
      'welcomeScreenSeen', 'exploreTooltipSeen', 'channelsTooltipSeen',
      'dealsTooltipSeen', 'walletTooltipSeen', 'profileTooltipSeen',
      'firstChannelAdded', 'firstDealCreated', 'firstDealCompleted', 'walletConnected',
    ];
    if (!validSteps.includes(step)) {
      throw new Error(`Invalid step: ${step}`);
    }
    return this.prisma.userOnboarding.upsert({
      where: { userId },
      create: { userId, [step]: true },
      update: { [step]: true },
    });
  }
}
