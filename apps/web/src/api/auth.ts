import { apiClient } from './client';
import { User } from '../stores/authStore';

interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: (initData: string) =>
    apiClient.post<AuthResponse>('/auth/telegram', { initData }),

  getMe: () =>
    apiClient.get<User>('/auth/me'),

  updateProfile: (data: Partial<User>) =>
    apiClient.patch<User>('/users/me', data),

  connectWallet: (walletAddress: string) =>
    apiClient.post<User>('/users/me/wallet', { walletAddress }),

  disconnectWallet: () =>
    apiClient.delete<User>('/users/me/wallet'),
};
