import { api } from '../lib/api';

export interface OnboardingStatus {
  welcomeScreenSeen: boolean;
  exploreTooltipSeen: boolean;
  channelsTooltipSeen: boolean;
  dealsTooltipSeen: boolean;
  walletTooltipSeen: boolean;
  profileTooltipSeen: boolean;
  firstChannelAdded: boolean;
  firstDealCreated: boolean;
  firstDealCompleted: boolean;
  walletConnected: boolean;
}

export const onboardingApi = {
  getStatus: () => api.get<OnboardingStatus>('/onboarding').then(r => r.data),
  update: (data: Partial<OnboardingStatus>) => api.patch('/onboarding', data),
  complete: (step: string) => api.post('/onboarding/complete', { step }),
};
