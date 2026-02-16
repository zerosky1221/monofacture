import { apiClient } from './client';

export interface ReviewAuthor {
  id: string;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  telegramUsername: string | null;
}

export interface Review {
  id: string;
  dealId: string;
  authorId: string;
  recipientId: string;
  channelId: string | null;
  rating: number;
  communicationRating: number | null;
  timelinessRating: number | null;
  qualityRating: number | null;
  comment: string | null;
  tags: string[];
  response: string | null;
  respondedAt: string | null;
  isPublic: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  author?: ReviewAuthor;
  recipient?: ReviewAuthor;
  deal?: {
    id: string;
    referenceNumber: string;
    adFormat: string;
  };
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  topTags: { tag: string; count: number }[];
}

export interface PaginatedReviews {
  items: Review[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  averageRating?: number;
  ratingDistribution?: Record<number, number>;
}

export interface PendingReview {
  id: string;
  referenceNumber: string;
  adFormat: string;
  completedAt: string | null;
  channel: {
    id: string;
    title: string;
    username: string | null;
  };
  recipientId: string;
}

export interface CreateReviewData {
  dealId: string;
  rating: number;
  communicationRating?: number;
  qualityRating?: number;
  timelinessRating?: number;
  comment?: string;
  tags?: string[];
}

export const reviewsApi = {
  create: (data: CreateReviewData) =>
    apiClient.post<Review>('/reviews', data),

  getUserReviews: (userId: string, page = 1, limit = 20, sort = 'newest') =>
    apiClient.get<PaginatedReviews>(`/reviews/user/${userId}`, {
      params: { page, limit, sort },
    }),

  getMyGiven: (page = 1, limit = 20) =>
    apiClient.get<PaginatedReviews>('/reviews/my/given', {
      params: { page, limit },
    }),

  getMyReceived: (page = 1, limit = 20) =>
    apiClient.get<PaginatedReviews>('/reviews/my/received', {
      params: { page, limit },
    }),

  getDealReviews: (dealId: string) =>
    apiClient.get<Review[]>(`/reviews/deal/${dealId}`),

  getPending: () =>
    apiClient.get<PendingReview[]>('/reviews/pending'),

  reply: (reviewId: string, reply: string) =>
    apiClient.patch<Review>(`/reviews/${reviewId}/reply`, { reply }),

  getStats: (userId: string) =>
    apiClient.get<ReviewStats>(`/reviews/stats/${userId}`),
};
