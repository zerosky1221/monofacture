import { api } from '../lib/api';

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface UserLevel {
  level: number;
  xp: number;
  totalXp: number;
  levelName: string;
  nextLevel: { level: number; name: string; xpRequired: number } | null;
  progress: number;
}

export interface LeaderboardUser {
  rank: number;
  id: string;
  firstName: string | null;
  telegramUsername: string | null;
  photoUrl: string | null;
  xp: number;
  level: number;
  achievementCount: number;
  totalDeals: number;
  totalEarnings: string;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  users: LeaderboardUser[];
  currentUserRank: number | null;
  currentUser: LeaderboardUser | null;
  totalUsers: number;
}

export interface RankInfo {
  rank: number;
  totalUsers: number;
  xp: number;
  level: number;
  nextLevelXp: number;
  currentLevelXp: number;
  xpToNextLevel: number;
  xpProgress: number;
  xpNeeded: number;
  achievementCount: number;
  percentile: number;
}

export const achievementsApi = {
  getAll: () =>
    api
      .get<{ achievements: Achievement[]; level: UserLevel; stats: { total: number; unlocked: number } }>('/achievements')
      .then(r => r.data),

  getLevel: () => api.get<UserLevel>('/achievements/level').then(r => r.data),

  getLeaderboard: (sortBy: 'xp' | 'deals' | 'earnings' = 'xp', limit = 100) =>
    api
      .get<LeaderboardResponse>(`/achievements/leaderboard?sortBy=${sortBy}&limit=${limit}`)
      .then(r => r.data),

  getMyRank: () => api.get<RankInfo>('/achievements/my-rank').then(r => r.data),

  check: () =>
    api.post<{ newlyAwarded: string[]; totalXpGained: number }>('/achievements/check').then(r => r.data),

  recalculateXp: () => api.post<{ xp: number }>('/achievements/recalculate-xp').then(r => r.data),
};
