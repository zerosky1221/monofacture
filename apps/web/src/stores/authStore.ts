import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
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

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  telegramId: string | null;
  setAuth: (token: string, refreshToken: string, user: User) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

const STORAGE_VERSION = 2;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      telegramId: null,
      setAuth: (token, refreshToken, user) =>
        set({ token, refreshToken, user, telegramId: user.telegramId }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, refreshToken: null, user: null, telegramId: null }),
    }),
    {
      name: 'auth-storage',
      version: STORAGE_VERSION,
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        telegramId: state.telegramId,
      }),
      migrate: () => {
        return { token: null, refreshToken: null, user: null, telegramId: null };
      },
    },
  ),
);
