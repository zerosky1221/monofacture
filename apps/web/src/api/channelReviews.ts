import { apiClient } from './client';

export interface ChannelReviewAuthor {
  id: string;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  telegramUsername: string | null;
}

export interface ChannelReview {
  id: string;
  dealId: string;
  channelId: string;
  fromUserId: string;
  overallRating: number;
  audienceQuality: number | null;
  engagementRating: number | null;
  reachAccuracy: number | null;
  comment: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  fromUser?: ChannelReviewAuthor;
  channel?: {
    id: string;
    title: string;
    username: string | null;
    photoUrl: string | null;
  };
  deal?: {
    id: string;
    referenceNumber: string;
    adFormat: string;
  };
}

export interface ChannelReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  topTags: { tag: string; count: number }[];
}

export interface PaginatedChannelReviews {
  items: ChannelReview[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateChannelReviewData {
  dealId: string;
  channelId: string;
  overallRating: number;
  audienceQuality?: number;
  engagementRating?: number;
  reachAccuracy?: number;
  comment?: string;
  tags?: string[];
}

export const channelReviewsApi = {
  create: (data: CreateChannelReviewData) =>
    apiClient.post<ChannelReview>('/channel-reviews', data),

  getChannelReviews: (channelId: string, page = 1, limit = 20, sort = 'newest') =>
    apiClient.get<PaginatedChannelReviews>(`/channel-reviews/channel/${channelId}`, {
      params: { page, limit, sort },
    }),

  getStats: (channelId: string) =>
    apiClient.get<ChannelReviewStats>(`/channel-reviews/stats/${channelId}`),

  getMy: (page = 1, limit = 20) =>
    apiClient.get<PaginatedChannelReviews>('/channel-reviews/my', {
      params: { page, limit },
    }),
};
