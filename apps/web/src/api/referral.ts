import { apiClient } from './client';

export interface ReferralCode {
  code: string;
  referralLink: string;
}

export interface ReferredUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  joinedAt: string;
  lastActiveAt: string;
  totalDeals: number;
  successfulDeals: number;
}

export interface ReferralItem {
  id: string;
  user: ReferredUser | null;
  dealCount: number;
  totalEarned: string;
  isActive: boolean;
  createdAt: string;
}

export interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  totalDeals: number;
  totalEarned: string;
  referrals: {
    id: string;
    referredUserId: string;
    userName: string;
    username: string | null;
    joinedAt: string;
    userJoinedAt: string;
    dealCount: number;
    totalEarned: string;
    isActive: boolean;
    userTotalDeals: number;
    userSuccessfulDeals: number;
  }[];
  recentEarnings: {
    id: string;
    dealId: string;
    dealReference: string;
    dealStatus: string;
    dealAmount: string;
    platformFee: string;
    earning: string;
    createdAt: string;
  }[];
}

export interface ReferralEarning {
  id: string;
  dealId: string;
  dealReference: string;
  dealStatus: string;
  referredUserName: string;
  referredUsername: string | null;
  dealAmount: string;
  platformFee: string;
  earning: string;
  createdAt: string;
}

export interface PaginatedReferrals {
  items: ReferralItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedEarnings {
  items: ReferralEarning[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const referralApi = {
  getStats: () => apiClient.get<ReferralStats>('/referral/stats'),
  getCode: () => apiClient.get<ReferralCode>('/referral/code'),
  getMyReferrals: (page = 1, limit = 20) =>
    apiClient.get<PaginatedReferrals>('/referral/my-referrals', {
      params: { page, limit },
    }),
  getEarnings: (page = 1, limit = 20) =>
    apiClient.get<PaginatedEarnings>('/referral/earnings', {
      params: { page, limit },
    }),
};
