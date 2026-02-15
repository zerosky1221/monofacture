export const PLATFORM_FEE_RATE = 0.05;
export const MIN_DEAL_AMOUNT = 1_000_000_000n;
export const MAX_DEAL_AMOUNT = 100_000_000_000_000n;

export const DEFAULT_DEAL_TIMEOUT_HOURS = 24;
export const DEFAULT_PAYMENT_TIMEOUT_HOURS = 24;
export const DEFAULT_CREATIVE_TIMEOUT_HOURS = 48;
export const DEFAULT_POST_DURATION_HOURS = 24;

export const MAX_CHANNELS_PER_USER = 50;
export const MAX_CAMPAIGNS_PER_USER = 20;
export const MAX_ACTIVE_DEALS_PER_USER = 100;

export const VERIFICATION_CHECK_INTERVALS = [1, 6, 12];
export const MAX_CREATIVE_REVISIONS = 3;

export const TON_DECIMALS = 9;
export const NANO_TON_MULTIPLIER = 1_000_000_000n;

export const CACHE_TTL = {
  USER: 300,
  CHANNEL: 300,
  CHANNEL_STATS: 3600,
  DEAL: 60,
  TRANSACTION: 60,
};

export const QUEUES = {
  CHANNEL_STATS: 'channel-stats',
  POST_SCHEDULER: 'post-scheduler',
  POST_PUBLISHER: 'post-publisher',
  POST_VERIFICATION: 'post-verification',
  ESCROW_MONITOR: 'escrow-monitor',
  DEAL_TIMEOUT: 'deal-timeout',
  NOTIFICATIONS: 'notifications',
};

export const EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  CHANNEL_CREATED: 'channel.created',
  CHANNEL_VERIFIED: 'channel.verified',
  CHANNEL_STATS_UPDATED: 'channel.stats.updated',
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_PUBLISHED: 'campaign.published',
  DEAL_CREATED: 'deal.created',
  DEAL_STATUS_CHANGED: 'deal.status.changed',
  DEAL_COMPLETED: 'deal.completed',
  ESCROW_CREATED: 'escrow.created',
  ESCROW_FUNDED: 'escrow.funded',
  ESCROW_RELEASED: 'escrow.released',
  ESCROW_REFUNDED: 'escrow.refunded',
  POST_SCHEDULED: 'post.scheduled',
  POST_PUBLISHED: 'post.published',
  POST_VERIFIED: 'post.verified',
  POST_VERIFICATION_FAILED: 'post.verification.failed',
  POST_VIOLATION: 'post.violation',
  POST_DURATION_ENDED: 'post.duration.ended',
};
