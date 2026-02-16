import { apiClient } from './client';

export type DealStatus =
  | 'CREATED'
  | 'PENDING_PAYMENT'
  | 'PAYMENT_RECEIVED'
  | 'IN_PROGRESS'
  | 'CREATIVE_PENDING'
  | 'CREATIVE_SUBMITTED'
  | 'CREATIVE_APPROVED'
  | 'CREATIVE_REVISION_REQUESTED'
  | 'SCHEDULED'
  | 'POSTED'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'EXPIRED';

export type AdFormat = 'POST';

export interface DealEscrow {
  id: string;
  escrowWalletAddress: string;
  status: 'PENDING' | 'FUNDED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED' | 'LOCKED' | 'RELEASING' | 'REFUNDING';
  amount: string;
  totalAmount?: string;
  platformFee?: string;
  fundedAt?: string;
  releasedAt?: string;
  refundedAt?: string;
  expiresAt?: string;
}

export interface DealCreative {
  id: string;
  text?: string;
  mediaUrls: string[];
  buttons?: Array<Array<{ text: string; url: string }>>;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  version: number;
  sourceChatId?: string;
  sourceMessageId?: number;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  revisionRequests: string[];
}

export interface DealTimeline {
  id: string;
  event: string;
  fromStatus?: string;
  toStatus?: string;
  actorId?: string;
  actorType: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  actor?: {
    id: string;
    firstName: string;
    telegramUsername?: string;
  };
}

export interface Deal {
  id: string;
  referenceNumber: string;
  adFormat: AdFormat;
  status: DealStatus;
  advertiserId: string;
  advertiser?: {
    id: string;
    telegramUsername?: string;
    firstName: string;
    lastName?: string;
    photoUrl?: string;
    rating: number;
    reviewCount: number;
  };
  channelOwnerId: string;
  channelOwner?: {
    id: string;
    telegramUsername?: string;
    firstName: string;
    lastName?: string;
    photoUrl?: string;
    rating: number;
    reviewCount: number;
  };
  channelId: string;
  channel?: {
    id: string;
    title: string;
    username?: string;
    photoUrl?: string;
    subscriberCount: number;
  };
  campaignId?: string;
  price: string;
  platformFee: string;
  totalAmount: string;
  brief?: string;
  requirements?: string;
  scheduledPostTime?: string;
  postDuration?: number;
  isPermanent?: boolean;
  postedAt?: string;
  postUrl?: string;
  viewsAtPost?: number;
  viewsAtVerify?: number;
  timeoutMinutes: number;
  lastActivityAt?: string;
  paidAt?: string;
  contentSubmittedAt?: string;
  publishedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  escrow?: DealEscrow;
  creative?: DealCreative;
  timeline?: DealTimeline[];
  publishedPosts?: Array<{
    id: string;
    telegramMessageId: string;
    publishedAt: string;
    scheduledDeleteAt?: string;
    deletedAt?: string;
    status: string;
  }>;
  isAnonymous?: boolean;
}

export interface DealFilters {
  status?: DealStatus | DealStatus[];
  role?: 'advertiser' | 'channel_owner';
  sortBy?: string;
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

export interface CreateDealDto {
  channelId: string;
  campaignId?: string;
  adFormat: AdFormat;
  brief?: string;
  requirements?: string;
  scheduledPostTime?: string;
  postDuration?: number;
  isPermanent?: boolean;
  isAnonymous?: boolean;
}

export interface SubmitCreativeDto {
  text?: string;
  mediaUrls?: string[];
  buttons?: Array<Array<{ text: string; url: string }>>;
}

export const dealsApi = {
  getAll: (filters?: DealFilters) =>
    apiClient.get<PaginatedResponse<Deal>>('/deals', { params: filters as Record<string, string | number | boolean | undefined> }),

  getById: (id: string) =>
    apiClient.get<Deal>(`/deals/${id}`),

  create: (data: CreateDealDto) =>
    apiClient.post<Deal>('/deals', data),

  accept: (id: string) =>
    apiClient.post<Deal>(`/deals/${id}/accept`),

  reject: (id: string, reason?: string) =>
    apiClient.post<Deal>(`/deals/${id}/reject`, { reason }),

  cancel: (id: string, reason?: string) =>
    apiClient.post<Deal>(`/deals/${id}/cancel`, { reason }),

  submitCreative: (id: string, dto: SubmitCreativeDto) =>
    apiClient.post<Deal>(`/deals/${id}/creative`, dto),

  approveCreative: (id: string) =>
    apiClient.post<Deal>(`/deals/${id}/creative/approve`),

  requestRevision: (id: string, feedback: string) =>
    apiClient.post<Deal>(`/deals/${id}/creative/revision`, { feedback }),

  getTimeline: (id: string) =>
    apiClient.get<DealTimeline[]>(`/deals/${id}/timeline`),

  confirmPost: (id: string, postUrl?: string) =>
    apiClient.post<Deal>(`/deals/${id}/confirm-post`, { postUrl }),

  confirmCompletion: (id: string) =>
    apiClient.post<Deal>(`/deals/${id}/complete`),
};

export interface PaymentInfo {
  address: string;
  amount: string;
  amountFormatted: string;
  paymentLink: string;
  qrData: string;
  expiresAt: string;
}

export const escrowApi = {
  getPaymentInfo: (dealId: string) =>
    apiClient.get<PaymentInfo>(`/escrow/deals/${dealId}/payment-info`),
};
