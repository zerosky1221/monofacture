import { apiClient } from './client';

export interface Channel {
  id: string;
  telegramId: string;
  username?: string;
  title: string;
  description?: string;
  photoUrl?: string;
  subscriberCount: number;
  categories?: string[];
  language?: string;
  isVerified: boolean;
  isFeatured?: boolean;
  rating?: number;
  channelRating?: number;
  channelReviewCount?: number;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED';
  ownerId: string;
  owner?: {
    id: string;
    username?: string;
    firstName: string;
    photoUrl?: string;
    rating: number;
    reviewCount: number;
  };
  pricing: ChannelPricingItem[];
  stats?: ChannelStats;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelPricingItem {
  id: string;
  adFormat: string;
  pricePerHour: string;
  pricePermanent: string | null;
  minHours: number;
  maxHours: number;
  publishTimeStart: string | null;
  publishTimeEnd: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
}

export interface ChannelPricing {
  id: string;
  pricePerPost: string;
  pricePerStory: string;
  pricePerRepost: string;
  discountWeekly?: number;
  discountMonthly?: number;
  minimumPostDuration?: number;
  currency: string;
}

export interface ChannelStats {
  id: string;
  averageViews: number;
  averageReach: number;
  engagementRate: number;
  completedDeals: number;
  totalEarned: string;
  lastUpdated: string;
}

export interface ChannelFilters {
  search?: string;
  category?: string;
  minSubscribers?: number;
  maxSubscribers?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  verified?: boolean;
  language?: string;
  isVerified?: boolean;
  featured?: boolean;
  sortBy?: 'subscribers' | 'price' | 'rating' | 'channelRating' | 'deals' | 'popular' | 'newest';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  data?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const channelsApi = {
  getAll: (filters?: ChannelFilters) =>
    apiClient.get<PaginatedResponse<Channel>>('/channels', { params: filters as Record<string, string | number | boolean | undefined> }),

  getById: (id: string) =>
    apiClient.get<Channel>(`/channels/${id}`),

  getMyChannels: () =>
    apiClient.get<Channel[]>('/channels/my'),

  create: (data: CreateChannelDto) =>
    apiClient.post<Channel>('/channels', data),

  update: (id: string, data: UpdateChannelDto) =>
    apiClient.patch<Channel>(`/channels/${id}`, data),

  updatePricing: (id: string, data: UpdatePricingDto) =>
    apiClient.patch<ChannelPricing>(`/channels/${id}/pricing`, data),

  delete: (id: string) =>
    apiClient.delete(`/channels/${id}`),

  verify: (id: string) =>
    apiClient.post(`/channels/${id}/verify`),

  getCategories: () =>
    apiClient.get<string[]>('/channels/categories'),

  getStats: (id: string) =>
    apiClient.get<ChannelStats>(`/channels/${id}/stats`),
};

export interface CreateChannelDto {
  telegramId: string;
  username: string;
  title: string;
  description?: string;
  category: string;
  language?: string;
  pricePerPost: string;
  pricePerStory?: string;
  pricePerRepost?: string;
}

export interface UpdateChannelDto {
  title?: string;
  description?: string;
  category?: string;
  language?: string;
}

export interface UpdatePricingDto {
  pricePerPost?: string;
  pricePerStory?: string;
  pricePerRepost?: string;
  discountWeekly?: number;
  discountMonthly?: number;
  minimumPostDuration?: number;
}
