export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export enum NotificationType {
  DEAL_CREATED = 'DEAL_CREATED',
  DEAL_UPDATED = 'DEAL_UPDATED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  CREATIVE_SUBMITTED = 'CREATIVE_SUBMITTED',
  CREATIVE_APPROVED = 'CREATIVE_APPROVED',
  CREATIVE_REJECTED = 'CREATIVE_REJECTED',
  POST_SCHEDULED = 'POST_SCHEDULED',
  POST_PUBLISHED = 'POST_PUBLISHED',
  POST_VERIFIED = 'POST_VERIFIED',
  PAYOUT_SENT = 'PAYOUT_SENT',
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  SYSTEM = 'SYSTEM',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isSent: boolean;
  sentAt: Date | null;
  sentVia: string[];
  isRead: boolean;
  readAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
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
  title: string | null;
  comment: string | null;
  response: string | null;
  respondedAt: Date | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewDto {
  rating: number;
  communicationRating?: number;
  timelinessRating?: number;
  qualityRating?: number;
  title?: string;
  comment?: string;
}

export interface PublishedPost {
  id: string;
  dealId: string;
  telegramMessageId: bigint;
  telegramChannelId: bigint;
  content: string | null;
  mediaUrls: string[];
  isVerified: boolean;
  verifiedAt: Date | null;
  verificationAttempts: number;
  isDeleted: boolean;
  isEdited: boolean;
  deletedAt: Date | null;
  editedAt: Date | null;
  views: number;
  reactions: number;
  shares: number;
  requiredDuration: number;
  actualDuration: number | null;
  scheduledAt: Date;
  publishedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}
