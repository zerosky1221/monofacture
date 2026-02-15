import { DealStatus } from '../types/deal.types.js';

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  [DealStatus.CREATED]: 'Created',
  [DealStatus.PENDING_PAYMENT]: 'Awaiting Payment',
  [DealStatus.PAYMENT_RECEIVED]: 'Payment Received',
  [DealStatus.IN_PROGRESS]: 'In Progress',
  [DealStatus.CREATIVE_PENDING]: 'Awaiting Creative',
  [DealStatus.CREATIVE_SUBMITTED]: 'Creative Submitted',
  [DealStatus.CREATIVE_REVISION_REQUESTED]: 'Revision Requested',
  [DealStatus.CREATIVE_APPROVED]: 'Creative Approved',
  [DealStatus.SCHEDULED]: 'Scheduled',
  [DealStatus.POSTED]: 'Posted',
  [DealStatus.VERIFYING]: 'Verifying',
  [DealStatus.VERIFIED]: 'Verified',
  [DealStatus.COMPLETED]: 'Completed',
  [DealStatus.DISPUTED]: 'Disputed',
  [DealStatus.REFUNDED]: 'Refunded',
  [DealStatus.CANCELLED]: 'Cancelled',
  [DealStatus.EXPIRED]: 'Expired',
};

export const DEAL_STATUS_COLORS: Record<DealStatus, string> = {
  [DealStatus.CREATED]: 'blue',
  [DealStatus.PENDING_PAYMENT]: 'yellow',
  [DealStatus.PAYMENT_RECEIVED]: 'green',
  [DealStatus.IN_PROGRESS]: 'blue',
  [DealStatus.CREATIVE_PENDING]: 'yellow',
  [DealStatus.CREATIVE_SUBMITTED]: 'blue',
  [DealStatus.CREATIVE_REVISION_REQUESTED]: 'orange',
  [DealStatus.CREATIVE_APPROVED]: 'green',
  [DealStatus.SCHEDULED]: 'blue',
  [DealStatus.POSTED]: 'green',
  [DealStatus.VERIFYING]: 'blue',
  [DealStatus.VERIFIED]: 'green',
  [DealStatus.COMPLETED]: 'green',
  [DealStatus.DISPUTED]: 'red',
  [DealStatus.REFUNDED]: 'gray',
  [DealStatus.CANCELLED]: 'gray',
  [DealStatus.EXPIRED]: 'gray',
};

export const TERMINAL_DEAL_STATUSES: DealStatus[] = [
  DealStatus.COMPLETED,
  DealStatus.REFUNDED,
  DealStatus.CANCELLED,
  DealStatus.EXPIRED,
];

export const ACTIVE_DEAL_STATUSES: DealStatus[] = [
  DealStatus.CREATED,
  DealStatus.PENDING_PAYMENT,
  DealStatus.PAYMENT_RECEIVED,
  DealStatus.IN_PROGRESS,
  DealStatus.CREATIVE_PENDING,
  DealStatus.CREATIVE_SUBMITTED,
  DealStatus.CREATIVE_REVISION_REQUESTED,
  DealStatus.CREATIVE_APPROVED,
  DealStatus.SCHEDULED,
  DealStatus.POSTED,
  DealStatus.VERIFYING,
  DealStatus.VERIFIED,
  DealStatus.DISPUTED,
];
