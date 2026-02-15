import type { AdFormat } from './channel.types.js';

export enum DealStatus {
  CREATED = 'CREATED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  CREATIVE_PENDING = 'CREATIVE_PENDING',
  CREATIVE_SUBMITTED = 'CREATIVE_SUBMITTED',
  CREATIVE_REVISION_REQUESTED = 'CREATIVE_REVISION_REQUESTED',
  CREATIVE_APPROVED = 'CREATIVE_APPROVED',
  SCHEDULED = 'SCHEDULED',
  POSTED = 'POSTED',
  VERIFYING = 'VERIFYING',
  VERIFIED = 'VERIFIED',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED_ADVERTISER = 'RESOLVED_ADVERTISER',
  RESOLVED_CHANNEL_OWNER = 'RESOLVED_CHANNEL_OWNER',
  CANCELLED = 'CANCELLED',
}

export enum DisputeReason {
  POST_NOT_PUBLISHED = 'POST_NOT_PUBLISHED',
  POST_DELETED_EARLY = 'POST_DELETED_EARLY',
  POST_MODIFIED = 'POST_MODIFIED',
  WRONG_CONTENT = 'WRONG_CONTENT',
  WRONG_TIME = 'WRONG_TIME',
  OTHER = 'OTHER',
}

export interface Deal {
  id: string;
  referenceNumber: string;
  advertiserId: string;
  channelOwnerId: string;
  channelId: string;
  campaignId: string | null;
  adFormat: AdFormat;
  price: bigint;
  platformFee: bigint;
  totalAmount: bigint;
  currency: string;
  status: DealStatus;
  previousStatus: DealStatus | null;
  brief: string | null;
  requirements: string | null;
  attachments: string[] | null;
  scheduledPostTime: Date | null;
  postDuration: number | null;
  creativeDeadline: Date | null;
  paymentDeadline: Date | null;
  completionDeadline: Date | null;
  timeoutMinutes: number;
  lastActivityAt: Date;
  isUrgent: boolean;
  requiresVerification: boolean;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

export interface DealCreative {
  id: string;
  dealId: string;
  text: string | null;
  mediaUrls: string[];
  buttons: InlineButton[][] | null;
  version: number;
  previousVersions: DealCreativeVersion[] | null;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  advertiserNotes: string | null;
  revisionRequests: string[] | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealCreativeVersion {
  version: number;
  text: string | null;
  mediaUrls: string[];
  submittedAt: Date;
}

export interface InlineButton {
  text: string;
  url: string;
}

export interface DealTimeline {
  id: string;
  dealId: string;
  event: string;
  fromStatus: DealStatus | null;
  toStatus: DealStatus | null;
  actorId: string | null;
  actorType: 'USER' | 'SYSTEM' | 'BOT' | null;
  metadata: Record<string, unknown> | null;
  note: string | null;
  createdAt: Date;
}

export interface DealMessage {
  id: string;
  dealId: string;
  senderId: string;
  content: string;
  isSystem: boolean;
  isRead: boolean;
  createdAt: Date;
}

export interface Dispute {
  id: string;
  dealId: string;
  initiatorId: string;
  reason: DisputeReason;
  description: string;
  evidence: string[] | null;
  status: DisputeStatus;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  requestedRefund: bigint | null;
  actualRefund: bigint | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDealDto {
  channelId: string;
  adFormat: AdFormat;
  brief?: string;
  requirements?: string;
  scheduledPostTime?: string;
  postDuration?: number;
}

export interface SubmitCreativeDto {
  text?: string;
  mediaUrls?: string[];
  buttons?: InlineButton[][];
}

export interface OpenDisputeDto {
  reason: DisputeReason;
  description: string;
  evidence?: string[];
  requestedRefund?: string;
}

export interface DealFilters {
  role?: 'advertiser' | 'channel_owner';
  status?: DealStatus | DealStatus[];
  sortBy?: 'created' | 'updated' | 'scheduled';
  sortOrder?: 'asc' | 'desc';
}

export interface DealTransition {
  to: DealStatus;
  action: string;
  roles: ('advertiser' | 'channel_owner' | 'admin' | 'system')[];
}

export const DEAL_TRANSITIONS: Record<DealStatus, DealTransition[]> = {
  [DealStatus.CREATED]: [
    { to: DealStatus.PENDING_PAYMENT, action: 'accept', roles: ['channel_owner'] },
    { to: DealStatus.CANCELLED, action: 'reject', roles: ['channel_owner'] },
    { to: DealStatus.CANCELLED, action: 'cancel', roles: ['advertiser'] },
    { to: DealStatus.EXPIRED, action: 'timeout', roles: ['system'] },
  ],
  [DealStatus.PENDING_PAYMENT]: [
    { to: DealStatus.PAYMENT_RECEIVED, action: 'payment_confirmed', roles: ['system'] },
    { to: DealStatus.CANCELLED, action: 'cancel', roles: ['advertiser', 'channel_owner'] },
    { to: DealStatus.EXPIRED, action: 'timeout', roles: ['system'] },
  ],
  [DealStatus.PAYMENT_RECEIVED]: [
    { to: DealStatus.IN_PROGRESS, action: 'start', roles: ['system'] },
  ],
  [DealStatus.IN_PROGRESS]: [
    { to: DealStatus.CREATIVE_PENDING, action: 'await_creative', roles: ['system'] },
  ],
  [DealStatus.CREATIVE_PENDING]: [
    { to: DealStatus.CREATIVE_SUBMITTED, action: 'submit_creative', roles: ['channel_owner'] },
    { to: DealStatus.CANCELLED, action: 'cancel', roles: ['advertiser'] },
    { to: DealStatus.DISPUTED, action: 'dispute', roles: ['advertiser'] },
    { to: DealStatus.EXPIRED, action: 'timeout', roles: ['system'] },
  ],
  [DealStatus.CREATIVE_SUBMITTED]: [
    { to: DealStatus.CREATIVE_APPROVED, action: 'approve', roles: ['advertiser'] },
    { to: DealStatus.CREATIVE_REVISION_REQUESTED, action: 'request_revision', roles: ['advertiser'] },
    { to: DealStatus.DISPUTED, action: 'dispute', roles: ['advertiser', 'channel_owner'] },
  ],
  [DealStatus.CREATIVE_REVISION_REQUESTED]: [
    { to: DealStatus.CREATIVE_SUBMITTED, action: 'submit_creative', roles: ['channel_owner'] },
    { to: DealStatus.CANCELLED, action: 'cancel', roles: ['advertiser'] },
    { to: DealStatus.DISPUTED, action: 'dispute', roles: ['advertiser', 'channel_owner'] },
  ],
  [DealStatus.CREATIVE_APPROVED]: [
    { to: DealStatus.SCHEDULED, action: 'schedule', roles: ['system'] },
  ],
  [DealStatus.SCHEDULED]: [
    { to: DealStatus.POSTED, action: 'confirm_posted', roles: ['channel_owner', 'system'] },
    { to: DealStatus.DISPUTED, action: 'dispute', roles: ['advertiser'] },
    { to: DealStatus.EXPIRED, action: 'timeout', roles: ['system'] },
  ],
  [DealStatus.POSTED]: [
    { to: DealStatus.COMPLETED, action: 'confirm_completion', roles: ['advertiser', 'system'] },
    { to: DealStatus.VERIFYING, action: 'start_verification', roles: ['system'] },
    { to: DealStatus.DISPUTED, action: 'dispute', roles: ['advertiser'] },
  ],
  [DealStatus.VERIFYING]: [
    { to: DealStatus.VERIFIED, action: 'verify_success', roles: ['system'] },
    { to: DealStatus.DISPUTED, action: 'verify_failed', roles: ['system'] },
    { to: DealStatus.DISPUTED, action: 'dispute', roles: ['advertiser'] },
  ],
  [DealStatus.VERIFIED]: [
    { to: DealStatus.COMPLETED, action: 'release_funds', roles: ['system'] },
  ],
  [DealStatus.DISPUTED]: [
    { to: DealStatus.COMPLETED, action: 'resolve_channel_owner', roles: ['admin'] },
    { to: DealStatus.REFUNDED, action: 'resolve_advertiser', roles: ['admin'] },
  ],
  [DealStatus.COMPLETED]: [],
  [DealStatus.REFUNDED]: [],
  [DealStatus.CANCELLED]: [],
  [DealStatus.EXPIRED]: [],
};
