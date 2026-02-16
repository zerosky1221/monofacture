import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTelegram } from '../providers/TelegramProvider';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface User {
  id: string;
  telegramId: string;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  tonWalletAddress?: string;
  roles: string[];
  isVerified: boolean;
  totalDeals?: number;
  successfulDeals?: number;
  rating?: number;
  reviewCount?: number;
  totalSpent?: string;
  totalEarned?: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const REFERRAL_KEY = 'mf_referral_code';

export function useAuth() {
  const { initData, startParam, user: telegramUser, isReady } = useTelegram();
  const { token, telegramId: storedTelegramId, setAuth, clearAuth, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isReady || !telegramUser) return;

    const currentTelegramId = telegramUser.id.toString();

    if (storedTelegramId && storedTelegramId !== currentTelegramId) {
      clearAuth();
      queryClient.clear();
    }
  }, [isReady, telegramUser, storedTelegramId, clearAuth, queryClient]);

  const authMutation = useMutation({
    mutationFn: async () => {
      if (!initData) throw new Error('No init data');

      const referralCode = startParam || localStorage.getItem(REFERRAL_KEY) || undefined;

      const response = await api.post<AuthResponse>('/auth/telegram', {
        initData,
        ...(referralCode && { referralCode }),
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.refreshToken, data.user);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      localStorage.removeItem(REFERRAL_KEY);
    },
    onError: () => {},
  });

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await api.get<User>('/users/me');
      return response.data;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!isReady || isInitialized) return;

    if (initData && !token) {
      setIsInitialized(true);
      authMutation.mutate();
    } else if (initData && token && telegramUser) {
      const currentTelegramId = telegramUser.id.toString();
      if (storedTelegramId && storedTelegramId !== currentTelegramId) {
        setIsInitialized(true);
        authMutation.mutate();
      } else {
        setIsInitialized(true);
      }
    } else if (!initData) {
      setIsInitialized(true);
    }
  }, [isReady, initData, token, isInitialized, telegramUser, storedTelegramId]);

  const logout = () => {
    clearAuth();
    queryClient.clear();
  };

  const isLoading = !isReady || authMutation.isPending || (!!token && isUserLoading);

  return {
    isAuthenticated: !!token && !!user,
    isLoading,
    user: currentUser || user,
    token,
    logout,
    telegramUser,
  };
}
