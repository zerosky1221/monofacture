import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi, OnboardingStatus } from '../api/onboarding';

export function useOnboarding() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['onboarding'],
    queryFn: onboardingApi.getStatus,
    staleTime: Infinity,
  });

  const completeMutation = useMutation({
    mutationFn: (step: keyof OnboardingStatus) => onboardingApi.complete(step),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding'] }),
  });

  return {
    status,
    isLoading,
    complete: completeMutation.mutate,
    shouldShowWelcome: status && !status.welcomeScreenSeen,
    shouldShowTooltip: (key: keyof OnboardingStatus) => status ? !status[key] : false,
  };
}
